import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  Plus,
  Save,
  Play,
  Rocket,
  CheckCircle2,
  Zap,
  GitBranch,
  Shuffle,
  Variable,
  Globe,
  ShieldCheck,
  Flag,
} from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { nodeTypes, type StudioNodeData } from "@/components/workflow/nodeTypes"
import { NodeConfigDialog } from "@/components/workflow/NodeConfigDialog"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { WorkflowGraph, WorkflowGraphNode, WorkflowNodeType, WorkflowSummary, WorkflowDetail, WorkflowVersion, RunResult } from "@/types"

const NODE_PALETTE: { type: WorkflowNodeType; label: string; icon: typeof Zap }[] = [
  { type: "trigger", label: "Trigger", icon: Zap },
  { type: "condition", label: "Condition", icon: GitBranch },
  { type: "transform", label: "Transform Data", icon: Shuffle },
  { type: "setVariable", label: "Set Variable", icon: Variable },
  { type: "mockApiAction", label: "Mock API Action", icon: Globe },
  { type: "verifyOutcome", label: "Verify Outcome", icon: ShieldCheck },
  { type: "end", label: "End", icon: Flag },
]

function toFlowNode(n: WorkflowGraphNode, traceStatus?: StudioNodeData["traceStatus"]): Node {
  return {
    id: n.id,
    type: "workflowNode",
    position: n.position,
    data: { name: n.data.name, config: n.data.config, nodeType: n.type, traceStatus },
  }
}

function toGraph(nodes: Node[], edges: Edge[]): WorkflowGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: (n.data as StudioNodeData).nodeType,
      position: n.position,
      data: { name: (n.data as StudioNodeData).name, config: (n.data as StudioNodeData).config },
    })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined })),
  }
}

export function WorkflowStudio() {
  const { data: workflowsData, loading: listLoading, reload: reloadList } = useFetch(
    () => api.get<{ workflows: WorkflowSummary[] }>("/workflows"),
    []
  )
  const [workflowId, setWorkflowId] = useState("")
  const [versionId, setVersionId] = useState("")
  const [newWorkflowOpen, setNewWorkflowOpen] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({ name: "", domain: "", description: "" })
  const [testOpen, setTestOpen] = useState(false)
  const [testInput, setTestInput] = useState('{\n  \n}')
  const [testResult, setTestResult] = useState<RunResult | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ variant: "error" | "warning"; text: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<WorkflowGraphNode | null>(null)
  const [dirty, setDirty] = useState(false)

  const workflows = workflowsData?.workflows ?? []
  const activeWorkflowId = workflowId || workflows[0]?.id || ""

  const { data: detailData, reload: reloadDetail } = useFetch(
    () =>
      activeWorkflowId
        ? api.get<{ workflow: WorkflowDetail }>(`/workflows/${activeWorkflowId}`)
        : Promise.resolve<{ workflow: WorkflowDetail | null }>({ workflow: null }),
    [activeWorkflowId]
  )
  const workflow = detailData?.workflow
  const versions = workflow?.versions ?? []
  const activeVersion: WorkflowVersion | undefined = versions.find((v) => v.id === versionId) ?? versions[0]

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    if (activeVersion) {
      setNodes(activeVersion.graph.nodes.map((n) => toFlowNode(n)))
      setEdges(
        activeVersion.graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          animated: false,
          style: e.sourceHandle === "false" ? { stroke: "#DC2626" } : e.sourceHandle === "true" ? { stroke: "#16A34A" } : undefined,
        }))
      )
      setDirty(false)
      setTestResult(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion?.id])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, id: `e-${connection.source}-${connection.target}-${connection.sourceHandle ?? "x"}` }, eds))
      setDirty(true)
    },
    [setEdges]
  )

  function addNode(type: WorkflowNodeType) {
    const id = `${type}-${Date.now()}`
    const meta = NODE_PALETTE.find((n) => n.type === type)!
    setNodes((ns) => [
      ...ns,
      { id, type: "workflowNode", position: { x: 150 + ns.length * 40, y: 250 + (ns.length % 3) * 40 }, data: { name: meta.label, config: {}, nodeType: type } },
    ])
    setDirty(true)
  }

  function openNodeConfig(nodeId: string) {
    const n = nodes.find((n) => n.id === nodeId)
    if (!n) return
    const data = n.data as StudioNodeData
    setSelectedNode({ id: n.id, type: data.nodeType, position: n.position, data: { name: data.name, config: data.config } })
  }

  function saveNodeConfig(updated: WorkflowGraphNode) {
    setNodes((ns) =>
      ns.map((n) => (n.id === updated.id ? { ...n, data: { ...n.data, name: updated.data.name, config: updated.data.config } } : n))
    )
    setSelectedNode(null)
    setDirty(true)
  }

  function deleteNode(nodeId: string) {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId))
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode(null)
    setDirty(true)
  }

  async function createWorkflow() {
    const { workflow: created } = await api.post<{ workflow: WorkflowDetail }>("/workflows", newWorkflow)
    setNewWorkflowOpen(false)
    setNewWorkflow({ name: "", domain: "", description: "" })
    await reloadList()
    setWorkflowId(created.id)
  }

  async function saveVersion() {
    if (!activeVersion || !workflow) return
    setBanner(null)
    if (activeVersion.isPublished) {
      const { version } = await api.post<{ version: WorkflowVersion }>(`/workflows/${workflow.id}/versions`, {
        graph: toGraph(nodes, edges),
      })
      await reloadDetail()
      setVersionId(version.id)
      setBanner({ variant: "warning", text: `Published version was immutable — created v${version.versionNum} with your changes.` })
    } else {
      await api.patch(`/workflows/${workflow.id}/versions/${activeVersion.id}`, { graph: toGraph(nodes, edges) })
      await reloadDetail()
      setBanner({ variant: "warning", text: "Saved." })
    }
    setDirty(false)
  }

  async function validateCurrent(): Promise<boolean> {
    if (!workflow || !activeVersion) return false
    const result = await api.post<{ valid: boolean; errors: string[] }>(
      `/workflows/${workflow.id}/versions/${activeVersion.id}/validate`,
      { graph: toGraph(nodes, edges) }
    )
    if (!result.valid) {
      setBanner({ variant: "error", text: result.errors.join(" ") })
      return false
    }
    setBanner(null)
    return true
  }

  async function runTest() {
    if (!workflow || !activeVersion) return
    setTestError(null)
    let parsedInput: Record<string, unknown>
    try {
      parsedInput = JSON.parse(testInput)
    } catch {
      setTestError("Input must be valid JSON.")
      return
    }
    try {
      const result = await api.post<RunResult>(`/workflows/${workflow.id}/versions/${activeVersion.id}/test`, {
        input: parsedInput,
        graph: toGraph(nodes, edges),
      })
      setTestResult(result)
      setNodes((ns) =>
        ns.map((n) => {
          const traceEntry = result.trace.find((t) => t.nodeId === n.id)
          return { ...n, data: { ...n.data, traceStatus: traceEntry?.status ?? null } }
        })
      )
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Test run failed")
    }
  }

  async function publish() {
    if (!workflow || !activeVersion) return
    const valid = await validateCurrent()
    if (!valid) return
    if (dirty) await saveVersion()
    await api.post(`/workflows/${workflow.id}/publish`, { versionId: activeVersion.id })
    await reloadDetail()
    setBanner({ variant: "warning", text: "Published." })
  }

  const publishedBadgeStatus = activeVersion?.isPublished ? "PUBLISHED" : "DRAFT"

  const flowNodesWithTrace = useMemo(() => nodes, [nodes])

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader
        title="Workflow Studio"
        description="Visual automation builder with a deterministic, side-effect-free test execution engine."
        actions={
          <Button onClick={() => setNewWorkflowOpen(true)}>
            <Plus className="h-4 w-4" /> New Workflow
          </Button>
        }
      />

      {listLoading ? (
        <Skeleton className="h-10 w-96" />
      ) : workflows.length === 0 ? (
        <EmptyState icon={Zap} title="No workflows yet" description="Create a workflow to start building its graph." actionLabel="New Workflow" onAction={() => setNewWorkflowOpen(true)} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Select value={activeWorkflowId} onValueChange={(v) => { setWorkflowId(v); setVersionId("") }}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activeVersion?.id ?? ""} onValueChange={setVersionId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.versionNum} {v.isPublished ? "(published)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <StatusBadge status={publishedBadgeStatus} />
            {dirty && <Badge variant="warning">Unsaved changes</Badge>}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Plus className="h-3.5 w-3.5" /> Add Node
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {NODE_PALETTE.map((n) => (
                  <DropdownMenuItem key={n.type} onClick={() => addNode(n.type)}>
                    <n.icon className="h-4 w-4" /> {n.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="secondary" size="sm" onClick={validateCurrent}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Validate
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setTestOpen(true)}>
              <Play className="h-3.5 w-3.5" /> Test
            </Button>
            <Button variant="secondary" size="sm" onClick={saveVersion} disabled={!dirty}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Button size="sm" onClick={publish}>
              <Rocket className="h-3.5 w-3.5" /> Publish
            </Button>
          </div>

          {banner && <InlineBanner variant={banner.variant} className="mb-3">{banner.text}</InlineBanner>}

          <div className="flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <ReactFlow
              nodes={flowNodesWithTrace}
              edges={edges}
              onNodesChange={(c) => {
                onNodesChange(c)
                setDirty(true)
              }}
              onEdgesChange={(c) => {
                onEdgesChange(c)
                setDirty(true)
              }}
              onConnect={onConnect}
              onNodeDoubleClick={(_, n) => openNodeConfig(n.id)}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>
        </>
      )}

      <NodeConfigDialog node={selectedNode} onClose={() => setSelectedNode(null)} onSave={saveNodeConfig} onDelete={deleteNode} />

      <Dialog open={newWorkflowOpen} onOpenChange={setNewWorkflowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={newWorkflow.name} onChange={(e) => setNewWorkflow((w) => ({ ...w, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Domain</Label>
              <Input value={newWorkflow.domain} onChange={(e) => setNewWorkflow((w) => ({ ...w, domain: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Textarea value={newWorkflow.description} onChange={(e) => setNewWorkflow((w) => ({ ...w, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createWorkflow} disabled={!newWorkflow.name || !newWorkflow.domain || !newWorkflow.description}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Execution (side-effect-free)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Input Data (JSON)</Label>
              <Textarea className="min-h-[220px] font-mono text-xs" value={testInput} onChange={(e) => setTestInput(e.target.value)} />
              {testError && <InlineBanner className="text-xs">{testError}</InlineBanner>}
              <Button size="sm" onClick={runTest}>
                <Play className="h-3.5 w-3.5" /> Run
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Execution Trace</Label>
              <div className="flex max-h-[260px] flex-col gap-1.5 overflow-auto">
                {testResult?.trace.length ? (
                  testResult.trace.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md border border-[var(--border)] px-2 py-1.5 text-xs">
                      <span>{t.nodeName}</span>
                      <StatusBadge status={t.status} />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted">Run the workflow to see its trace here.</p>
                )}
              </div>
              {testResult && (
                <p className="text-xs text-muted">
                  {testResult.completed ? `Reached terminal node: ${testResult.terminalNodeName}` : `Stopped: ${testResult.stoppedReason}`}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
