import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client.js"

export const contractsRouter = Router()

const ruleSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS", "IS_EMPTY", "IS_NOT_EMPTY"]),
  value: z.string().optional(),
  logicGroup: z.enum(["AND", "OR"]).default("AND"),
  order: z.number().default(0),
})

const contractSchema = z.object({
  name: z.string().min(1),
  businessObjective: z.string().min(1),
  domain: z.string().min(1),
  ownerId: z.string().min(1),
  workflowId: z.string().optional(),
  trigger: z.string().min(1),
  preconditions: z.array(z.string()).default([]),
  expectedOutcomes: z.array(z.string()).default([]),
  prohibitedOutcomes: z.array(z.string()).default([]),
  exceptions: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  kpis: z.array(z.string()).default([]),
  verificationMethod: z.string().min(1),
  businessRules: z.array(ruleSchema).default([]),
})

function serialize(contract: any) {
  return {
    ...contract,
    preconditions: JSON.parse(contract.preconditions),
    expectedOutcomes: JSON.parse(contract.expectedOutcomes),
    prohibitedOutcomes: JSON.parse(contract.prohibitedOutcomes),
    exceptions: JSON.parse(contract.exceptions),
    acceptanceCriteria: JSON.parse(contract.acceptanceCriteria),
    kpis: JSON.parse(contract.kpis),
  }
}

contractsRouter.get("/", async (req, res) => {
  const { status, domain, ownerId } = req.query
  const contracts = await prisma.businessContract.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(domain ? { domain: String(domain) } : {}),
      ...(ownerId ? { ownerId: String(ownerId) } : {}),
    },
    include: { owner: true, businessRules: true, workflow: true, scenarios: true },
    orderBy: { updatedAt: "desc" },
  })
  res.json({ contracts: contracts.map(serialize) })
})

contractsRouter.get("/:id", async (req, res) => {
  const contract = await prisma.businessContract.findUnique({
    where: { id: req.params.id },
    include: { owner: true, businessRules: true, workflow: true, scenarios: true },
  })
  if (!contract) return res.status(404).json({ message: "Contract not found" })
  res.json({ contract: serialize(contract) })
})

contractsRouter.post("/", async (req, res) => {
  const parsed = contractSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid contract payload", issues: parsed.error.issues })
  const { businessRules, ...data } = parsed.data

  const contract = await prisma.businessContract.create({
    data: {
      ...data,
      preconditions: JSON.stringify(data.preconditions),
      expectedOutcomes: JSON.stringify(data.expectedOutcomes),
      prohibitedOutcomes: JSON.stringify(data.prohibitedOutcomes),
      exceptions: JSON.stringify(data.exceptions),
      acceptanceCriteria: JSON.stringify(data.acceptanceCriteria),
      kpis: JSON.stringify(data.kpis),
      status: "DRAFT",
      businessRules: { create: businessRules },
    },
    include: { owner: true, businessRules: true },
  })

  await prisma.auditEvent.create({
    data: { entityType: "BusinessContract", entityId: contract.id, action: "CREATED", actorId: data.ownerId },
  })

  res.status(201).json({ contract: serialize(contract) })
})

contractsRouter.patch("/:id", async (req, res) => {
  const existing = await prisma.businessContract.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: "Contract not found" })

  const parsed = contractSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid contract payload", issues: parsed.error.issues })
  const { businessRules, ...data } = parsed.data

  const updateData: Record<string, unknown> = { ...data }
  for (const key of ["preconditions", "expectedOutcomes", "prohibitedOutcomes", "exceptions", "acceptanceCriteria", "kpis"]) {
    if (key in data) updateData[key] = JSON.stringify((data as any)[key])
  }

  const contract = await prisma.businessContract.update({
    where: { id: req.params.id },
    data: updateData,
    include: { owner: true, businessRules: true },
  })

  await prisma.auditEvent.create({
    data: { entityType: "BusinessContract", entityId: contract.id, action: "UPDATED" },
  })

  res.json({ contract: serialize(contract) })
})

contractsRouter.post("/:id/transition", async (req, res) => {
  const { status } = z.object({ status: z.enum(["DRAFT", "UNDER_REVIEW", "APPROVED", "ACTIVE", "ARCHIVED"]) }).parse(req.body)

  const existing = await prisma.businessContract.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: "Contract not found" })

  const allowedTransitions: Record<string, string[]> = {
    DRAFT: ["UNDER_REVIEW"],
    UNDER_REVIEW: ["APPROVED", "DRAFT"],
    APPROVED: ["ACTIVE", "UNDER_REVIEW"],
    ACTIVE: ["ARCHIVED"],
    ARCHIVED: [],
  }
  if (!allowedTransitions[existing.status]?.includes(status)) {
    return res.status(409).json({ message: `Cannot transition from ${existing.status} to ${status}` })
  }

  const contract = await prisma.businessContract.update({
    where: { id: req.params.id },
    data: { status },
  })

  await prisma.auditEvent.create({
    data: { entityType: "BusinessContract", entityId: contract.id, action: `STATUS_${status}` },
  })

  res.json({ contract: serialize(contract) })
})

contractsRouter.post("/:id/duplicate", async (req, res) => {
  const source = await prisma.businessContract.findUnique({
    where: { id: req.params.id },
    include: { businessRules: true },
  })
  if (!source) return res.status(404).json({ message: "Contract not found" })

  const copy = await prisma.businessContract.create({
    data: {
      name: `${source.name} (Copy)`,
      businessObjective: source.businessObjective,
      domain: source.domain,
      ownerId: source.ownerId,
      workflowId: source.workflowId,
      trigger: source.trigger,
      preconditions: source.preconditions,
      expectedOutcomes: source.expectedOutcomes,
      prohibitedOutcomes: source.prohibitedOutcomes,
      exceptions: source.exceptions,
      acceptanceCriteria: source.acceptanceCriteria,
      kpis: source.kpis,
      verificationMethod: source.verificationMethod,
      status: "DRAFT",
      businessRules: {
        create: source.businessRules.map((r) => ({
          field: r.field,
          operator: r.operator,
          value: r.value,
          logicGroup: r.logicGroup,
          order: r.order,
        })),
      },
    },
    include: { owner: true, businessRules: true },
  })

  res.status(201).json({ contract: serialize(copy) })
})
