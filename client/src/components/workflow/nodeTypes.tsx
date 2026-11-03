import { Handle, Position, type NodeProps } from "@xyflow/react"
import {
  Zap,
  GitBranch,
  Shuffle,
  Variable,
  Globe,
  ShieldCheck,
  Flag,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkflowNodeType } from "@/types"

export const NODE_META: Record<WorkflowNodeType, { label: string; icon: LucideIcon; color: string }> = {
  trigger: { label: "Trigger", icon: Zap, color: "text-indigo border-indigo/40 bg-indigo/5" },
  condition: { label: "Condition", icon: GitBranch, color: "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800" },
  transform: { label: "Transform Data", icon: Shuffle, color: "text-violet-600 border-violet-300 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800" },
  setVariable: { label: "Set Variable", icon: Variable, color: "text-sky-600 border-sky-300 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800" },
  mockApiAction: { label: "Mock API Action", icon: Globe, color: "text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800" },
  verifyOutcome: { label: "Verify Outcome", icon: ShieldCheck, color: "text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800" },
  end: { label: "End", icon: Flag, color: "text-slate-500 border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-600" },
}

export type StudioNodeData = {
  name: string
  config?: Record<string, unknown>
  nodeType: WorkflowNodeType
  traceStatus?: "SUCCESS" | "FAILED" | "SKIPPED" | null
}

export function StudioNode({ data, selected }: NodeProps & { data: StudioNodeData }) {
  const meta = NODE_META[data.nodeType]
  const Icon = meta.icon

  return (
    <div
      className={cn(
        "flex min-w-[180px] items-center gap-2 rounded-lg border-2 bg-[var(--card)] px-3 py-2.5 shadow-sm",
        meta.color,
        selected && "ring-2 ring-indigo ring-offset-1"
      )}
    >
      {data.nodeType !== "trigger" && <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5" />}
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{meta.label}</span>
        <span className="text-sm font-medium text-[var(--text)]">{data.name}</span>
      </div>
      {data.traceStatus && (
        <span
          className={cn(
            "ml-auto h-2 w-2 rounded-full",
            data.traceStatus === "SUCCESS" ? "bg-green-500" : data.traceStatus === "FAILED" ? "bg-red-500" : "bg-slate-400"
          )}
        />
      )}

      {data.nodeType === "condition" ? (
        <>
          <Handle type="source" position={Position.Right} id="true" style={{ top: "35%" }} className="!h-2.5 !w-2.5 !bg-green-500" />
          <Handle type="source" position={Position.Right} id="false" style={{ top: "70%" }} className="!h-2.5 !w-2.5 !bg-red-500" />
        </>
      ) : data.nodeType !== "end" ? (
        <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5" />
      ) : null}
    </div>
  )
}

export const nodeTypes = { workflowNode: StudioNode }
