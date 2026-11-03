import { Router } from "express"
import { prisma } from "../db/client.js"

export const executionsRouter = Router()

executionsRouter.get("/", async (req, res) => {
  const { workflowId, technicalStatus, businessOutcomeStatus } = req.query
  const executions = await prisma.executionRecord.findMany({
    where: {
      ...(workflowId ? { workflowId: String(workflowId) } : {}),
      ...(technicalStatus ? { technicalStatus: String(technicalStatus) } : {}),
      ...(businessOutcomeStatus ? { businessOutcomeStatus: String(businessOutcomeStatus) } : {}),
    },
    include: { workflow: { select: { id: true, name: true, domain: true } } },
    orderBy: { startedAt: "desc" },
    take: 200,
  })
  res.json({
    executions: executions.map((e) => ({
      ...e,
      inputSnapshot: JSON.parse(e.inputSnapshot),
      outputSnapshot: e.outputSnapshot ? JSON.parse(e.outputSnapshot) : null,
    })),
  })
})

executionsRouter.get("/:id", async (req, res) => {
  const execution = await prisma.executionRecord.findUnique({
    where: { id: req.params.id },
    include: {
      workflow: { select: { id: true, name: true, domain: true } },
      workflowVersion: { select: { id: true, versionNum: true } },
      nodeTraces: { orderBy: { order: "asc" } },
      outcomeVerifications: { include: { contract: { select: { id: true, name: true } } } },
    },
  })
  if (!execution) return res.status(404).json({ message: "Execution not found" })

  res.json({
    execution: {
      ...execution,
      inputSnapshot: JSON.parse(execution.inputSnapshot),
      outputSnapshot: execution.outputSnapshot ? JSON.parse(execution.outputSnapshot) : null,
      nodeTraces: execution.nodeTraces.map((t) => ({
        ...t,
        input: JSON.parse(t.input),
        output: t.output ? JSON.parse(t.output) : null,
      })),
      outcomeVerifications: execution.outcomeVerifications.map((o) => ({
        ...o,
        expectedState: JSON.parse(o.expectedState),
        observedState: JSON.parse(o.observedState),
      })),
    },
  })
})
