import { describe, it, expect } from "vitest"
import { validateGraph, runWorkflow, type WorkflowGraph } from "./workflowInterpreter.js"

function makeGraph(overrides: Partial<WorkflowGraph> = {}): WorkflowGraph {
  return {
    nodes: [
      { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { name: "Start" } },
      { id: "cond1", type: "condition", position: { x: 1, y: 0 }, data: { name: "Check", config: { field: "payment.status", operator: "EQUALS", value: "SUCCESS" } } },
      { id: "action1", type: "mockApiAction", position: { x: 2, y: 0 }, data: { name: "Activate", config: { effect: { field: "subscription.status", value: "ACTIVE" } } } },
      { id: "verify1", type: "verifyOutcome", position: { x: 3, y: 0 }, data: { name: "Verify", config: { field: "subscription.status", expected: "ACTIVE" } } },
      { id: "end1", type: "end", position: { x: 4, y: 0 }, data: { name: "Complete" } },
      { id: "end2", type: "end", position: { x: 2, y: 1 }, data: { name: "Rejected" } },
    ],
    edges: [
      { id: "e1", source: "t1", target: "cond1" },
      { id: "e2", source: "cond1", target: "action1", sourceHandle: "true" },
      { id: "e3", source: "cond1", target: "end2", sourceHandle: "false" },
      { id: "e4", source: "action1", target: "verify1" },
      { id: "e5", source: "verify1", target: "end1" },
    ],
    ...overrides,
  }
}

describe("validateGraph", () => {
  it("accepts a well-formed graph", () => {
    expect(validateGraph(makeGraph()).valid).toBe(true)
  })

  it("rejects a graph with no trigger", () => {
    const graph = makeGraph()
    graph.nodes = graph.nodes.filter((n) => n.type !== "trigger")
    const result = validateGraph(graph)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("Trigger"))).toBe(true)
  })

  it("rejects a graph with more than one trigger", () => {
    const graph = makeGraph()
    graph.nodes.push({ id: "t2", type: "trigger", position: { x: 0, y: 2 }, data: { name: "Second trigger" } })
    expect(validateGraph(graph).valid).toBe(false)
  })

  it("rejects an edge referencing a missing node", () => {
    const graph = makeGraph()
    graph.edges.push({ id: "bad", source: "t1", target: "does-not-exist" })
    const result = validateGraph(graph)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("missing"))).toBe(true)
  })

  it("rejects a condition node missing a true or false branch", () => {
    const graph = makeGraph()
    graph.edges = graph.edges.filter((e) => e.id !== "e3")
    const result = validateGraph(graph)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("true") && e.includes("false"))).toBe(true)
  })

  it("rejects a cycle", () => {
    const graph = makeGraph()
    graph.edges.push({ id: "loop", source: "end1", target: "cond1" })
    // end nodes have no outgoing edges in validateGraph's own check, but a direct
    // cycle among non-end nodes should still be caught
    graph.nodes.find((n) => n.id === "end1")!.type = "transform"
    graph.edges.push({ id: "loop2", source: "action1", target: "action1" })
    expect(validateGraph(graph).valid).toBe(false)
  })

  it("rejects a non-end node with no outgoing edge", () => {
    const graph = makeGraph()
    graph.edges = graph.edges.filter((e) => e.id !== "e4")
    expect(validateGraph(graph).valid).toBe(false)
  })
})

describe("runWorkflow", () => {
  it("activates and verifies on a successful payment", () => {
    const result = runWorkflow(makeGraph(), { payment: { status: "SUCCESS" }, subscription: { status: "INACTIVE" } })
    expect(result.completed).toBe(true)
    expect(result.terminalNodeName).toBe("Complete")
    expect(result.finalData).toMatchObject({ subscription: { status: "ACTIVE" } })
    expect(result.trace.find((t) => t.nodeId === "verify1")?.status).toBe("SUCCESS")
  })

  it("rejects immediately on a failed payment without touching subscription state", () => {
    const result = runWorkflow(makeGraph(), { payment: { status: "FAILED" }, subscription: { status: "INACTIVE" } })
    expect(result.completed).toBe(true)
    expect(result.terminalNodeName).toBe("Rejected")
    expect(result.finalData).toMatchObject({ subscription: { status: "INACTIVE" } })
  })

  it("stops cleanly on a simulated timeout at the action node", () => {
    const result = runWorkflow(makeGraph(), { payment: { status: "SUCCESS" }, subscription: { status: "INACTIVE" }, simulate: "TIMEOUT" })
    expect(result.completed).toBe(false)
    expect(result.trace.find((t) => t.nodeId === "action1")?.status).toBe("FAILED")
  })

  it("catches a silent failure: the action reports success but the verify step fails", () => {
    const result = runWorkflow(makeGraph(), { payment: { status: "SUCCESS" }, subscription: { status: "INACTIVE" }, simulate: "SILENT_FAILURE" })
    expect(result.trace.find((t) => t.nodeId === "action1")?.status).toBe("SUCCESS")
    expect(result.trace.find((t) => t.nodeId === "verify1")?.status).toBe("FAILED")
    expect(result.finalData).toMatchObject({ subscription: { status: "INACTIVE" } })
  })

  it("refuses to run an invalid graph and reports why", () => {
    const graph = makeGraph()
    graph.nodes = graph.nodes.filter((n) => n.type !== "trigger")
    const result = runWorkflow(graph, {})
    expect(result.completed).toBe(false)
    expect(result.stoppedReason).toContain("Trigger")
  })
})
