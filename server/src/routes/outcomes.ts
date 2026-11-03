import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client.js"

export const outcomesRouter = Router()

function serialize(o: any) {
  return {
    ...o,
    expectedState: JSON.parse(o.expectedState),
    observedState: JSON.parse(o.observedState),
    evidence: o.evidence ? JSON.parse(o.evidence) : null,
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

outcomesRouter.get("/", async (req, res) => {
  const { status, contractId } = req.query
  const outcomes = await prisma.outcomeVerification.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(contractId ? { contractId: String(contractId) } : {}),
    },
    include: {
      contract: { select: { id: true, name: true, domain: true } },
      execution: { select: { id: true, workflowId: true, startedAt: true, technicalStatus: true } },
    },
    orderBy: { verifiedAt: "desc" },
  })
  res.json({ outcomes: outcomes.map(serialize) })
})

outcomesRouter.get("/:id", async (req, res) => {
  const outcome = await prisma.outcomeVerification.findUnique({
    where: { id: req.params.id },
    include: {
      contract: true,
      execution: { include: { nodeTraces: { orderBy: { order: "asc" } } } },
    },
  })
  if (!outcome) return res.status(404).json({ message: "Outcome verification not found" })
  res.json({ outcome: serialize(outcome) })
})

outcomesRouter.post("/:id/reverify", async (req, res) => {
  const outcome = await prisma.outcomeVerification.findUnique({ where: { id: req.params.id } })
  if (!outcome) return res.status(404).json({ message: "Outcome verification not found" })

  const expected = JSON.parse(outcome.expectedState)
  const observed = JSON.parse(outcome.observedState)
  const matches = deepEqual(expected, observed)

  const updated = await prisma.outcomeVerification.update({
    where: { id: req.params.id },
    data: {
      status: matches ? "VERIFIED" : "MISMATCH",
      mismatchReason: matches ? null : outcome.mismatchReason ?? "Destination state does not match the expected contract outcome.",
      verifiedAt: new Date(),
    },
  })

  res.json({ outcome: serialize(updated) })
})

const resolutionSchema = z.object({
  resolutionStatus: z.enum(["OPEN", "RESOLVED", "ACCEPTED_RISK"]),
  note: z.string().optional(),
  ownerId: z.string().optional(),
})

outcomesRouter.patch("/:id/resolution", async (req, res) => {
  const outcome = await prisma.outcomeVerification.findUnique({ where: { id: req.params.id } })
  if (!outcome) return res.status(404).json({ message: "Outcome verification not found" })

  const parsed = resolutionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid resolution payload", issues: parsed.error.issues })

  if (parsed.data.resolutionStatus !== "OPEN" && outcome.status === "MISMATCH") {
    // Resolving/accepting risk on an unresolved mismatch requires evidence or a note — this is not a
    // way to silently relabel a mismatch as verified; status itself is never set here.
    if (!parsed.data.note) {
      return res.status(400).json({ message: "A resolution note is required to close out a mismatch." })
    }
  }

  const updated = await prisma.outcomeVerification.update({
    where: { id: req.params.id },
    data: {
      resolutionStatus: parsed.data.resolutionStatus,
      ownerId: parsed.data.ownerId ?? outcome.ownerId,
      mismatchReason: parsed.data.note ?? outcome.mismatchReason,
    },
  })

  res.json({ outcome: serialize(updated) })
})
