import { Router } from "express"
import { prisma } from "../db/client.js"

export const simulationsRouter = Router()

function serialize(sim: any) {
  return { ...sim, resultDetail: JSON.parse(sim.resultDetail) }
}

simulationsRouter.get("/", async (req, res) => {
  const { workflowId } = req.query
  const simulations = await prisma.changeSimulation.findMany({
    where: workflowId ? { workflowId: String(workflowId) } : undefined,
    include: {
      baselineVersion: { select: { id: true, versionNum: true } },
      proposedVersion: { select: { id: true, versionNum: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  const workflowIds = [...new Set(simulations.map((s) => s.workflowId))]
  const workflows = await prisma.workflow.findMany({ where: { id: { in: workflowIds } }, select: { id: true, name: true, domain: true } })
  const workflowMap = new Map(workflows.map((w) => [w.id, w]))

  res.json({
    simulations: simulations.map((s) => ({ ...serialize(s), workflow: workflowMap.get(s.workflowId) ?? null })),
  })
})

simulationsRouter.get("/:id", async (req, res) => {
  const sim = await prisma.changeSimulation.findUnique({
    where: { id: req.params.id },
    include: {
      baselineVersion: true,
      proposedVersion: true,
    },
  })
  if (!sim) return res.status(404).json({ message: "Simulation not found" })
  res.json({
    simulation: {
      ...serialize(sim),
      baselineVersion: { ...sim.baselineVersion, graph: JSON.parse(sim.baselineVersion.graph) },
      proposedVersion: { ...sim.proposedVersion, graph: JSON.parse(sim.proposedVersion.graph) },
    },
  })
})
