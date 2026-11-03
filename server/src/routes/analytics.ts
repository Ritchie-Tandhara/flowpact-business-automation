import { Router } from "express"
import { prisma } from "../db/client.js"

export const analyticsRouter = Router()

analyticsRouter.get("/by-domain", async (_req, res) => {
  const workflows = await prisma.workflow.groupBy({ by: ["domain"], _count: { _all: true } })
  const contracts = await prisma.businessContract.groupBy({ by: ["domain"], _count: { _all: true } })

  const domains = [...new Set([...workflows.map((w) => w.domain), ...contracts.map((c) => c.domain)])]
  res.json({
    domains: domains.map((domain) => ({
      domain,
      workflows: workflows.find((w) => w.domain === domain)?._count._all ?? 0,
      contracts: contracts.find((c) => c.domain === domain)?._count._all ?? 0,
    })),
  })
})

analyticsRouter.get("/contract-status", async (_req, res) => {
  const grouped = await prisma.businessContract.groupBy({ by: ["status"], _count: { _all: true } })
  res.json({ statuses: grouped.map((g) => ({ status: g.status, count: g._count._all })) })
})

analyticsRouter.get("/outcome-status", async (_req, res) => {
  const grouped = await prisma.outcomeVerification.groupBy({ by: ["status"], _count: { _all: true } })
  res.json({ statuses: grouped.map((g) => ({ status: g.status, count: g._count._all })) })
})

analyticsRouter.get("/approval-funnel", async (_req, res) => {
  const grouped = await prisma.approvalDecision.groupBy({ by: ["status"], _count: { _all: true } })
  res.json({ statuses: grouped.map((g) => ({ status: g.status, count: g._count._all })) })
})

analyticsRouter.get("/scenario-coverage", async (_req, res) => {
  const contracts = await prisma.businessContract.findMany({
    select: { id: true, name: true, domain: true, businessRules: { select: { field: true } }, scenarios: { select: { inputData: true } } },
  })
  const rows = contracts.map((c) => {
    const totalRules = new Set(c.businessRules.map((r) => r.field)).size
    const covered = new Set<string>()
    for (const s of c.scenarios) {
      let parsed: Record<string, unknown> = {}
      try {
        parsed = JSON.parse(s.inputData)
      } catch {
        /* ignore malformed */
      }
      for (const rule of c.businessRules) {
        const value = rule.field.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as any)[key] : undefined), parsed)
        if (value !== undefined) covered.add(rule.field)
      }
    }
    return {
      contractId: c.id,
      name: c.name,
      domain: c.domain,
      totalRules,
      coveredRules: covered.size,
      coveragePct: totalRules > 0 ? Number(((covered.size / totalRules) * 100).toFixed(1)) : 0,
      scenarioCount: c.scenarios.length,
    }
  })
  res.json({ rows })
})
