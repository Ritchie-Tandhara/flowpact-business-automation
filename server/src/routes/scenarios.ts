import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client.js"
import { evaluateRuleSet, expectedRulesSatisfied } from "../services/ruleEngine.js"
import { runWorkflow, validateGraph, type WorkflowGraph } from "../services/workflowInterpreter.js"

export const scenariosRouter = Router()

function j(v: unknown) {
  return JSON.stringify(v)
}

function serialize(scenario: any) {
  return {
    ...scenario,
    inputData: JSON.parse(scenario.inputData),
    preconditions: JSON.parse(scenario.preconditions),
    prohibitedActions: JSON.parse(scenario.prohibitedActions),
  }
}

const scenarioSchema = z.object({
  contractId: z.string().min(1),
  workflowId: z.string().optional(),
  testType: z.enum(["POSITIVE", "NEGATIVE", "BOUNDARY", "EXCEPTION", "REGRESSION"]),
  description: z.string().min(1),
  inputData: z.record(z.string(), z.unknown()).default({}),
  preconditions: z.array(z.string()).default([]),
  expectedDecision: z.string().min(1),
  expectedOutcome: z.string().min(1),
  prohibitedActions: z.array(z.string()).default([]),
  createdById: z.string().optional(),
})

scenariosRouter.get("/", async (req, res) => {
  const { contractId, testType } = req.query
  const scenarios = await prisma.testScenario.findMany({
    where: {
      ...(contractId ? { contractId: String(contractId) } : {}),
      ...(testType ? { testType: String(testType) } : {}),
    },
    include: {
      testRunResults: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  })
  res.json({
    scenarios: scenarios.map((s) => ({
      ...serialize(s),
      latestResult: s.testRunResults[0]
        ? { ...s.testRunResults[0], executionTrace: JSON.parse(s.testRunResults[0].executionTrace) }
        : null,
    })),
  })
})

scenariosRouter.post("/", async (req, res) => {
  const parsed = scenarioSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid scenario payload", issues: parsed.error.issues })
  const data = parsed.data

  const contract = await prisma.businessContract.findUnique({ where: { id: data.contractId } })
  if (!contract) return res.status(404).json({ message: "Contract not found" })

  const scenario = await prisma.testScenario.create({
    data: {
      contractId: data.contractId,
      workflowId: data.workflowId ?? contract.workflowId,
      createdById: data.createdById,
      testType: data.testType,
      description: data.description,
      inputData: j(data.inputData),
      preconditions: j(data.preconditions),
      expectedDecision: data.expectedDecision,
      expectedOutcome: data.expectedOutcome,
      prohibitedActions: j(data.prohibitedActions),
    },
  })
  res.status(201).json({ scenario: serialize(scenario) })
})

scenariosRouter.patch("/:id", async (req, res) => {
  const existing = await prisma.testScenario.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ message: "Scenario not found" })

  const parsed = scenarioSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: "Invalid scenario payload", issues: parsed.error.issues })
  const data = parsed.data

  const updateData: Record<string, unknown> = { ...data }
  if ("inputData" in data) updateData.inputData = j(data.inputData)
  if ("preconditions" in data) updateData.preconditions = j(data.preconditions)
  if ("prohibitedActions" in data) updateData.prohibitedActions = j(data.prohibitedActions)

  const scenario = await prisma.testScenario.update({ where: { id: req.params.id }, data: updateData })
  res.json({ scenario: serialize(scenario) })
})

scenariosRouter.delete("/:id", async (req, res) => {
  await prisma.testScenario.delete({ where: { id: req.params.id } }).catch(() => null)
  res.status(204).end()
})

scenariosRouter.post("/run-suite", async (req, res) => {
  const { contractId } = z.object({ contractId: z.string().min(1) }).parse(req.body)

  const contract = await prisma.businessContract.findUnique({
    where: { id: contractId },
    include: { businessRules: true, workflow: { include: { versions: { orderBy: [{ isPublished: "desc" }, { versionNum: "desc" }], take: 1 } } } },
  })
  if (!contract) return res.status(404).json({ message: "Contract not found" })

  const version = contract.workflow?.versions[0]
  if (!version) {
    return res.status(409).json({ message: "Contract must be linked to a workflow with at least one version before running scenarios." })
  }

  const graph = JSON.parse(version.graph) as WorkflowGraph
  const graphValidation = validateGraph(graph)

  const scenarios = await prisma.testScenario.findMany({ where: { contractId } })
  if (scenarios.length === 0) {
    return res.status(409).json({ message: "No scenarios exist for this contract yet." })
  }

  const testRun = await prisma.testRun.create({
    data: { workflowVersionId: version.id, totalScenarios: scenarios.length, passedCount: 0, failedCount: 0 },
  })

  let passedCount = 0
  const results = []
  for (const scenario of scenarios) {
    const input = JSON.parse(scenario.inputData)
    const { satisfied, details } = evaluateRuleSet(contract.businessRules, input)
    const expectedSatisfied = expectedRulesSatisfied(scenario.expectedDecision)
    const passed = satisfied === expectedSatisfied
    if (passed) passedCount++

    const actualDecision = satisfied ? "RULES_SATISFIED" : "RULES_BLOCKED"
    const actualOutcome = passed ? scenario.expectedOutcome : `Rule evaluation ${satisfied ? "satisfied" : "blocked"} the action; expected ${expectedSatisfied ? "satisfied" : "blocked"}.`

    // Pass/fail is decided by the rule check above (fast, always available). When the
    // linked workflow's current graph is valid, also run it through the real interpreter
    // so the scenario detail view can show what the graph itself would actually do with
    // this input, not just whether the contract's rules permit it.
    let graphTrace = null
    let graphOutcome: { completed: boolean; terminalNodeName: string | null; stoppedReason?: string } | null = null
    if (graphValidation.valid) {
      const runResult = runWorkflow(graph, input)
      graphTrace = runResult.trace
      graphOutcome = { completed: runResult.completed, terminalNodeName: runResult.terminalNodeName, stoppedReason: runResult.stoppedReason }
    }

    const executionTrace = { ruleTrace: details, graphTrace, graphOutcome, graphInvalidReason: graphValidation.valid ? null : graphValidation.errors.join(" ") }

    const result = await prisma.testRunResult.create({
      data: {
        testRunId: testRun.id,
        scenarioId: scenario.id,
        status: passed ? "PASSED" : "FAILED",
        actualDecision,
        actualOutcome,
        executionTrace: j(executionTrace),
      },
    })
    results.push({ ...result, executionTrace })
  }

  await prisma.testRun.update({
    where: { id: testRun.id },
    data: { passedCount, failedCount: scenarios.length - passedCount },
  })

  const testableRuleFields = new Set(contract.businessRules.map((r) => r.field))
  const coveredFields = new Set<string>()
  for (const scenario of scenarios) {
    const input = JSON.parse(scenario.inputData)
    const { details } = evaluateRuleSet(contract.businessRules, input)
    details.filter((d) => d.referenced).forEach((d) => coveredFields.add(d.field))
  }
  const ruleCoverage = testableRuleFields.size > 0 ? (coveredFields.size / testableRuleFields.size) * 100 : 0

  res.json({
    testRunId: testRun.id,
    totalScenarios: scenarios.length,
    passedCount,
    failedCount: scenarios.length - passedCount,
    ruleCoverage: Number(ruleCoverage.toFixed(1)),
    results,
  })
})
