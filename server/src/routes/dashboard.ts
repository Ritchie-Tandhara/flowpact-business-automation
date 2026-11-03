import { Router } from "express"
import { prisma } from "../db/client.js"

export const dashboardRouter = Router()

dashboardRouter.get("/", async (_req, res) => {
  const [
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    technicalSuccessCount,
    businessVerifiedCount,
    eligibleForOutcome,
    failedContractsCount,
    totalContracts,
    scenarioResults,
    pendingApprovals,
  ] = await Promise.all([
    prisma.workflow.count(),
    prisma.workflow.count({ where: { status: "PUBLISHED" } }),
    prisma.executionRecord.count(),
    prisma.executionRecord.count({ where: { technicalStatus: "SUCCESS" } }),
    prisma.outcomeVerification.count({ where: { status: "VERIFIED" } }),
    prisma.outcomeVerification.count(),
    prisma.outcomeVerification.count({ where: { status: "MISMATCH" } }),
    prisma.businessContract.count(),
    prisma.testRunResult.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.approvalDecision.count({ where: { status: "SUBMITTED" } }),
  ])

  const scenarioPassed = scenarioResults.find((r) => r.status === "PASSED")?._count._all ?? 0
  const scenarioTotal = scenarioResults.reduce((sum, r) => sum + r._count._all, 0)

  const workflowsAtRisk = await prisma.workflow.count({
    where: {
      executions: {
        some: { businessOutcomeStatus: "MISMATCH" },
      },
    },
  })

  const technicalSuccessRate = totalExecutions > 0 ? (technicalSuccessCount / totalExecutions) * 100 : 0
  const verifiedOutcomeRate = eligibleForOutcome > 0 ? (businessVerifiedCount / eligibleForOutcome) * 100 : 0

  res.json({
    kpis: {
      totalAutomations: totalWorkflows,
      activeAutomations: activeWorkflows,
      executions: totalExecutions,
      technicalSuccessRate: Number(technicalSuccessRate.toFixed(1)),
      verifiedBusinessOutcomeRate: Number(verifiedOutcomeRate.toFixed(1)),
      failedBusinessContracts: failedContractsCount,
      scenariosPassed: scenarioPassed,
      scenariosTotal: scenarioTotal,
      pendingApprovals,
      automationsAtRisk: workflowsAtRisk,
      totalContracts,
    },
  })
})

dashboardRouter.get("/execution-trends", async (_req, res) => {
  const executions = await prisma.executionRecord.findMany({
    select: { startedAt: true, technicalStatus: true, businessOutcomeStatus: true },
    orderBy: { startedAt: "asc" },
  })

  const byDay = new Map<string, { date: string; technicalSuccess: number; technicalFailed: number; outcomeVerified: number; outcomeMismatch: number }>()
  for (const e of executions) {
    const day = e.startedAt.toISOString().slice(0, 10)
    if (!byDay.has(day)) {
      byDay.set(day, { date: day, technicalSuccess: 0, technicalFailed: 0, outcomeVerified: 0, outcomeMismatch: 0 })
    }
    const bucket = byDay.get(day)!
    if (e.technicalStatus === "SUCCESS") bucket.technicalSuccess++
    else bucket.technicalFailed++
    if (e.businessOutcomeStatus === "VERIFIED") bucket.outcomeVerified++
    if (e.businessOutcomeStatus === "MISMATCH") bucket.outcomeMismatch++
  }

  res.json({ trends: Array.from(byDay.values()) })
})

dashboardRouter.get("/failure-categories", async (_req, res) => {
  const grouped = await prisma.executionRecord.groupBy({
    by: ["errorCategory"],
    where: { technicalStatus: { not: "SUCCESS" } },
    _count: { _all: true },
  })
  res.json({
    categories: grouped.map((g) => ({ category: g.errorCategory ?? "Uncategorized", count: g._count._all })),
  })
})
