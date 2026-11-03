import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client.js"

export const approvalsRouter = Router()

function serialize(a: any) {
  return { ...a, testSummary: a.testSummary ? JSON.parse(a.testSummary) : null }
}

approvalsRouter.get("/", async (req, res) => {
  const { status } = req.query
  const approvals = await prisma.approvalDecision.findMany({
    where: status ? { status: String(status) } : undefined,
    include: {
      workflowVersion: { select: { id: true, versionNum: true } },
      contract: { select: { id: true, name: true, status: true, acceptanceCriteria: true } },
      requester: { select: { id: true, name: true, role: true } },
      reviewer: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  const workflowIds = [...new Set(approvals.map((a) => a.workflowId))]
  const workflows = await prisma.workflow.findMany({ where: { id: { in: workflowIds } }, select: { id: true, name: true, domain: true } })
  const workflowMap = new Map(workflows.map((w) => [w.id, w]))

  res.json({ approvals: approvals.map((a) => ({ ...serialize(a), workflow: workflowMap.get(a.workflowId) ?? null })) })
})

const createSchema = z.object({
  workflowId: z.string().min(1),
  workflowVersionId: z.string().min(1),
  contractId: z.string().optional(),
  requesterId: z.string().min(1),
  reviewerId: z.string().optional(),
  comments: z.string().optional(),
})

approvalsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid approval payload", issues: parsed.error.issues })
  const data = parsed.data

  const version = await prisma.workflowVersion.findUnique({ where: { id: data.workflowVersionId } })
  if (!version) return res.status(404).json({ message: "Workflow version not found" })

  const latestRun = await prisma.testRun.findFirst({ where: { workflowVersionId: version.id }, orderBy: { triggeredAt: "desc" } })
  const testSummary = latestRun
    ? { totalScenarios: latestRun.totalScenarios, passedCount: latestRun.passedCount, failedCount: latestRun.failedCount }
    : null

  const approval = await prisma.approvalDecision.create({
    data: {
      workflowId: data.workflowId,
      workflowVersionId: data.workflowVersionId,
      contractId: data.contractId,
      requesterId: data.requesterId,
      reviewerId: data.reviewerId,
      comments: data.comments,
      status: "SUBMITTED",
      testSummary: testSummary ? JSON.stringify(testSummary) : null,
    },
  })

  await prisma.auditEvent.create({
    data: { entityType: "ApprovalDecision", entityId: approval.id, action: "SUBMITTED", actorId: data.requesterId },
  })

  res.status(201).json({ approval: serialize(approval) })
})

const decideSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewerId: z.string().min(1),
  comments: z.string().optional(),
  isException: z.boolean().default(false),
  exceptionReason: z.string().optional(),
})

approvalsRouter.post("/:id/decide", async (req, res) => {
  const approval = await prisma.approvalDecision.findUnique({ where: { id: req.params.id }, include: { contract: true } })
  if (!approval) return res.status(404).json({ message: "Approval not found" })
  if (approval.status !== "SUBMITTED") return res.status(409).json({ message: `Cannot decide an approval in status ${approval.status}` })

  const parsed = decideSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid decision payload", issues: parsed.error.issues })
  const data = parsed.data

  if (data.decision === "APPROVED" && !data.isException) {
    const testSummary = approval.testSummary ? JSON.parse(approval.testSummary) : null
    if (testSummary && testSummary.failedCount > 0) {
      return res.status(409).json({
        message: `Cannot approve: the latest test run has ${testSummary.failedCount} failing scenario(s). Approve as an authorized exception with a reason, or fix the failures first.`,
      })
    }
    if (approval.contract) {
      const criteria = JSON.parse(approval.contract.acceptanceCriteria) as string[]
      if (criteria.length === 0) {
        return res.status(409).json({ message: "Cannot approve: the linked contract has no acceptance criteria defined." })
      }
    }
  }

  if (data.isException && !data.exceptionReason) {
    return res.status(400).json({ message: "An exception approval requires a reason." })
  }

  const updated = await prisma.approvalDecision.update({
    where: { id: approval.id },
    data: {
      status: data.decision,
      reviewerId: data.reviewerId,
      comments: data.comments ?? approval.comments,
      isException: data.isException,
      exceptionReason: data.exceptionReason,
      decidedAt: new Date(),
    },
  })

  await prisma.auditEvent.create({
    data: {
      entityType: "ApprovalDecision",
      entityId: approval.id,
      action: data.decision,
      actorId: data.reviewerId,
      detail: data.isException ? JSON.stringify({ exception: true, reason: data.exceptionReason }) : null,
    },
  })

  res.json({ approval: serialize(updated) })
})
