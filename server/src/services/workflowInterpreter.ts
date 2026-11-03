import { evaluateRule } from "./ruleEngine.js"

export interface GraphNode {
  id: string
  type: "trigger" | "condition" | "transform" | "setVariable" | "mockApiAction" | "verifyOutcome" | "end"
  position: { x: number; y: number }
  data: { name: string; config?: Record<string, unknown> }
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

export interface WorkflowGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateGraph(graph: WorkflowGraph): ValidationResult {
  const errors: string[] = []
  const nodeIds = new Set(graph.nodes.map((n) => n.id))

  if (nodeIds.size !== graph.nodes.length) errors.push("Duplicate node ids found.")

  const triggers = graph.nodes.filter((n) => n.type === "trigger")
  if (triggers.length === 0) errors.push("Graph must contain exactly one Trigger node.")
  if (triggers.length > 1) errors.push("Graph must contain exactly one Trigger node; found multiple.")

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) errors.push(`Edge ${edge.id} references missing source node "${edge.source}".`)
    if (!nodeIds.has(edge.target)) errors.push(`Edge ${edge.id} references missing target node "${edge.target}".`)
  }

  for (const node of graph.nodes) {
    if (node.type === "condition") {
      const config = node.data.config as { field?: string; operator?: string } | undefined
      if (!config?.field || !config?.operator) {
        errors.push(`Condition node "${node.data.name}" is missing a field or operator.`)
      }
      const outgoing = graph.edges.filter((e) => e.source === node.id)
      const handles = new Set(outgoing.map((e) => e.sourceHandle))
      if (!handles.has("true") || !handles.has("false")) {
        errors.push(`Condition node "${node.data.name}" must have both a "true" and "false" outgoing branch.`)
      }
    }
    if (node.type !== "end") {
      const outgoing = graph.edges.filter((e) => e.source === node.id)
      if (outgoing.length === 0) {
        errors.push(`Node "${node.data.name}" has no outgoing connection.`)
      }
    }
  }

  // Cycle detection (DFS with coloring) - loops are not supported in this MVP.
  const color = new Map<string, 0 | 1 | 2>()
  const adjacency = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    adjacency.get(edge.source)!.push(edge.target)
  }
  function dfs(nodeId: string): boolean {
    color.set(nodeId, 1)
    for (const next of adjacency.get(nodeId) ?? []) {
      const state = color.get(next) ?? 0
      if (state === 1) return true
      if (state === 0 && dfs(next)) return true
    }
    color.set(nodeId, 2)
    return false
  }
  for (const node of graph.nodes) {
    if ((color.get(node.id) ?? 0) === 0 && dfs(node.id)) {
      errors.push("Graph contains a cycle, which this MVP's deterministic interpreter does not support.")
      break
    }
  }

  return { valid: errors.length === 0, errors }
}

export interface NodeTraceEntry {
  nodeId: string
  nodeType: string
  nodeName: string
  status: "SUCCESS" | "FAILED" | "SKIPPED"
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  errorMessage?: string
}

export interface RunResult {
  completed: boolean
  terminalNodeName: string | null
  trace: NodeTraceEntry[]
  finalData: Record<string, unknown>
  stoppedReason?: string
}

function getPath(data: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, data)
}

function setPath(data: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".")
  let cursor: Record<string, unknown> = data
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (typeof cursor[key] !== "object" || cursor[key] === null) cursor[key] = {}
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[keys[keys.length - 1]] = value
}

function resolveValue(raw: unknown, data: Record<string, unknown>): unknown {
  if (typeof raw === "string" && raw.startsWith("$")) {
    return getPath(data, raw.slice(1))
  }
  return raw
}

const MAX_STEPS = 50

export function runWorkflow(graph: WorkflowGraph, inputData: Record<string, unknown>): RunResult {
  const validation = validateGraph(graph)
  if (!validation.valid) {
    return { completed: false, terminalNodeName: null, trace: [], finalData: inputData, stoppedReason: validation.errors.join(" ") }
  }

  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]))
  const trigger = graph.nodes.find((n) => n.type === "trigger")!

  const data: Record<string, unknown> = JSON.parse(JSON.stringify(inputData))
  const trace: NodeTraceEntry[] = []
  let currentId: string | null = trigger.id
  let steps = 0

  while (currentId && steps < MAX_STEPS) {
    steps++
    const node = nodesById.get(currentId)
    if (!node) break
    const config = (node.data.config ?? {}) as Record<string, unknown>
    const inputSnapshot = JSON.parse(JSON.stringify(data))

    if (node.type === "end") {
      trace.push({ nodeId: node.id, nodeType: node.type, nodeName: node.data.name, status: "SUCCESS", input: inputSnapshot, output: inputSnapshot })
      return { completed: true, terminalNodeName: node.data.name, trace, finalData: data }
    }

    if (node.type === "trigger") {
      trace.push({ nodeId: node.id, nodeType: node.type, nodeName: node.data.name, status: "SUCCESS", input: inputSnapshot, output: inputSnapshot })
      currentId = graph.edges.find((e) => e.source === node.id)?.target ?? null
      continue
    }

    if (node.type === "condition") {
      const rule = { field: String(config.field), operator: String(config.operator), value: config.value as string | undefined, logicGroup: "AND" }
      const passed = evaluateRule(rule, data)
      trace.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.data.name,
        status: "SUCCESS",
        input: inputSnapshot,
        output: { passed },
      })
      const handle = passed ? "true" : "false"
      currentId = graph.edges.find((e) => e.source === node.id && e.sourceHandle === handle)?.target ?? null
      continue
    }

    if (node.type === "transform") {
      const setFields = (config.setFields ?? {}) as Record<string, unknown>
      for (const [field, value] of Object.entries(setFields)) {
        setPath(data, field, resolveValue(value, data))
      }
      trace.push({ nodeId: node.id, nodeType: node.type, nodeName: node.data.name, status: "SUCCESS", input: inputSnapshot, output: JSON.parse(JSON.stringify(data)) })
      currentId = graph.edges.find((e) => e.source === node.id)?.target ?? null
      continue
    }

    if (node.type === "setVariable") {
      const variableName = String(config.variableName ?? "")
      const value = resolveValue(config.value, data)
      if (variableName) setPath(data, variableName, value)
      trace.push({ nodeId: node.id, nodeType: node.type, nodeName: node.data.name, status: "SUCCESS", input: inputSnapshot, output: { [variableName]: value } })
      currentId = graph.edges.find((e) => e.source === node.id)?.target ?? null
      continue
    }

    if (node.type === "mockApiAction") {
      const simulate = data.simulate
      if (simulate === "TIMEOUT") {
        trace.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeName: node.data.name,
          status: "FAILED",
          input: inputSnapshot,
          output: null,
          errorMessage: "Mock API call timed out.",
        })
        return { completed: false, terminalNodeName: null, trace, finalData: data, stoppedReason: "Mock API timeout" }
      }
      const effect = config.effect as { field?: string; value?: unknown } | undefined
      if (simulate === "SILENT_FAILURE") {
        trace.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeName: node.data.name,
          status: "SUCCESS",
          input: inputSnapshot,
          output: { note: "Call returned success but destination state was not actually changed (simulated silent failure)." },
        })
      } else {
        if (effect?.field) setPath(data, effect.field, effect.value)
        trace.push({ nodeId: node.id, nodeType: node.type, nodeName: node.data.name, status: "SUCCESS", input: inputSnapshot, output: JSON.parse(JSON.stringify(data)) })
      }
      currentId = graph.edges.find((e) => e.source === node.id)?.target ?? null
      continue
    }

    if (node.type === "verifyOutcome") {
      const field = String(config.field)
      const expected = config.expected
      const actual = getPath(data, field)
      const verified = String(actual) === String(expected)
      trace.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.data.name,
        status: verified ? "SUCCESS" : "FAILED",
        input: inputSnapshot,
        output: { field, expected, actual, verified },
        errorMessage: verified ? undefined : `Expected ${field} to be "${expected}" but found "${actual}".`,
      })
      currentId = graph.edges.find((e) => e.source === node.id)?.target ?? null
      continue
    }

    currentId = null
  }

  return { completed: false, terminalNodeName: null, trace, finalData: data, stoppedReason: steps >= MAX_STEPS ? "Max step count reached" : "No further connection" }
}
