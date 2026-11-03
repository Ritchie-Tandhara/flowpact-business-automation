import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client.js"
import { runWorkflow, validateGraph, type WorkflowGraph } from "../services/workflowInterpreter.js"

export const workflowsRouter = Router()

function j(v: unknown) {
  return JSON.stringify(v)
}

const DEFAULT_GRAPH: WorkflowGraph = {
  nodes: [
    { id: "trigger-1", type: "trigger", position: { x: 50, y: 150 }, data: { name: "Trigger Event", config: { event: "manual" } } },
    { id: "end-1", type: "end", position: { x: 400, y: 150 }, data: { name: "Complete" } },
  ],
  edges: [{ id: "e1", source: "trigger-1", target: "end-1" }],
}

workflowsRouter.get("/", async (_req, res) => {
  const workflows = await prisma.workflow.findMany({
    select: { id: true, name: true, domain: true, status: true },
    orderBy: { name: "asc" },
  })
  res.json({ workflows })
})

workflowsRouter.get("/:id", async (req, res) => {
  const workflow = await prisma.workflow.findUnique({
    where: { id: req.params.id },
    include: { versions: { orderBy: { versionNum: "desc" } } },
  })
  if (!workflow) return res.status(404).json({ message: "Workflow not found" })
  res.json({
    workflow: {
      ...workflow,
      versions: workflow.versions.map((v) => ({ ...v, graph: JSON.parse(v.graph) })),
    },
  })
})

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().min(1),
})

workflowsRouter.post("/", async (req, res) => {
  const parsed = createWorkflowSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid workflow payload", issues: parsed.error.issues })

  const workflow = await prisma.workflow.create({
    data: {
      ...parsed.data,
      status: "DRAFT",
      versions: { create: [{ versionNum: 1, graph: j(DEFAULT_GRAPH), isPublished: false }] },
    },
    include: { versions: true },
  })
  res.status(201).json({ workflow: { ...workflow, versions: workflow.versions.map((v) => ({ ...v, graph: JSON.parse(v.graph) })) } })
})

const graphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["trigger", "condition", "transform", "setVariable", "mockApiAction", "verifyOutcome", "end"]),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z.object({ name: z.string(), config: z.record(z.string(), z.unknown()).optional() }),
    })
  ),
  edges: z.array(
    z.object({ id: z.string(), source: z.string(), target: z.string(), sourceHandle: z.string().optional() })
  ),
})

workflowsRouter.post("/:id/versions", async (req, res) => {
  const { graph, cloneFromVersionId } = z
    .object({ graph: graphSchema.optional(), cloneFromVersionId: z.string().optional() })
    .parse(req.body)

  const workflow = await prisma.workflow.findUnique({
    where: { id: req.params.id },
    include: { versions: { orderBy: { versionNum: "desc" }, take: 1 } },
  })
  if (!workflow) return res.status(404).json({ message: "Workflow not found" })

  let graphToUse = graph
  if (!graphToUse && cloneFromVersionId) {
    const source = await prisma.workflowVersion.findUnique({ where: { id: cloneFromVersionId } })
    if (source) graphToUse = JSON.parse(source.graph)
  }
  if (!graphToUse) graphToUse = workflow.versions[0] ? JSON.parse(workflow.versions[0].graph) : DEFAULT_GRAPH

  const nextVersionNum = (workflow.versions[0]?.versionNum ?? 0) + 1
  const version = await prisma.workflowVersion.create({
    data: { workflowId: workflow.id, versionNum: nextVersionNum, graph: j(graphToUse), isPublished: false },
  })
  res.status(201).json({ version: { ...version, graph: JSON.parse(version.graph) } })
})

workflowsRouter.patch("/:id/versions/:versionId", async (req, res) => {
  const version = await prisma.workflowVersion.findUnique({ where: { id: req.params.versionId } })
  if (!version || version.workflowId !== req.params.id) return res.status(404).json({ message: "Version not found" })
  if (version.isPublished) return res.status(409).json({ message: "Published versions are immutable. Create a new version to continue editing." })

  const parsed = z.object({ graph: graphSchema }).safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid graph payload", issues: parsed.error.issues })

  const updated = await prisma.workflowVersion.update({
    where: { id: version.id },
    data: { graph: j(parsed.data.graph) },
  })
  res.json({ version: { ...updated, graph: JSON.parse(updated.graph) } })
})

workflowsRouter.post("/:id/versions/:versionId/validate", async (req, res) => {
  const version = await prisma.workflowVersion.findUnique({ where: { id: req.params.versionId } })
  if (!version || version.workflowId !== req.params.id) return res.status(404).json({ message: "Version not found" })

  const graph = (req.body?.graph ?? JSON.parse(version.graph)) as WorkflowGraph
  res.json(validateGraph(graph))
})

workflowsRouter.post("/:id/versions/:versionId/test", async (req, res) => {
  const version = await prisma.workflowVersion.findUnique({ where: { id: req.params.versionId } })
  if (!version || version.workflowId !== req.params.id) return res.status(404).json({ message: "Version not found" })

  const { input, graph } = z
    .object({ input: z.record(z.string(), z.unknown()).default({}), graph: graphSchema.optional() })
    .parse(req.body)

  const graphToRun = (graph ?? JSON.parse(version.graph)) as WorkflowGraph
  const result = runWorkflow(graphToRun, input)
  res.json(result)
})

workflowsRouter.post("/:id/publish", async (req, res) => {
  const { versionId } = z.object({ versionId: z.string().min(1) }).parse(req.body)

  const version = await prisma.workflowVersion.findUnique({ where: { id: versionId } })
  if (!version || version.workflowId !== req.params.id) return res.status(404).json({ message: "Version not found" })

  const graph = JSON.parse(version.graph) as WorkflowGraph
  const validation = validateGraph(graph)
  if (!validation.valid) {
    return res.status(409).json({ message: "Cannot publish an invalid graph.", errors: validation.errors })
  }

  await prisma.$transaction([
    prisma.workflowVersion.updateMany({ where: { workflowId: req.params.id }, data: { isPublished: false } }),
    prisma.workflowVersion.update({ where: { id: versionId }, data: { isPublished: true } }),
    prisma.workflow.update({ where: { id: req.params.id }, data: { status: "PUBLISHED" } }),
  ])

  res.json({ published: true })
})
