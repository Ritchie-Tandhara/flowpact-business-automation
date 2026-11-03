import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkflowGraphNode, WorkflowNodeType } from "@/types"
import { NODE_META } from "./nodeTypes"

const OPERATORS = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS", "IS_EMPTY", "IS_NOT_EMPTY"]

interface NodeConfigDialogProps {
  node: WorkflowGraphNode | null
  onClose: () => void
  onSave: (node: WorkflowGraphNode) => void
  onDelete: (nodeId: string) => void
}

export function NodeConfigDialog({ node, onClose, onSave, onDelete }: NodeConfigDialogProps) {
  const [name, setName] = useState("")
  const [config, setConfig] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (node) {
      setName(node.data.name)
      setConfig(node.data.config ?? {})
    }
  }, [node])

  if (!node) return null

  function patchConfig(key: string, value: unknown) {
    setConfig((c) => ({ ...c, [key]: value }))
  }

  function save() {
    onSave({ ...node!, data: { name, config } })
  }

  const type: WorkflowNodeType = node.type
  const meta = NODE_META[type]

  return (
    <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {meta.label}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Node Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {type === "trigger" && (
            <div className="flex flex-col gap-1.5">
              <Label>Trigger Event</Label>
              <Input
                value={String(config.event ?? "")}
                onChange={(e) => patchConfig("event", e.target.value)}
                placeholder="e.g. payment.completed"
              />
            </div>
          )}

          {type === "condition" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Field</Label>
                <Input
                  value={String(config.field ?? "")}
                  onChange={(e) => patchConfig("field", e.target.value)}
                  placeholder="e.g. payment.status"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Operator</Label>
                <Select value={String(config.operator ?? "EQUALS")} onValueChange={(v) => patchConfig("operator", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!["IS_EMPTY", "IS_NOT_EMPTY"].includes(String(config.operator)) && (
                <div className="flex flex-col gap-1.5">
                  <Label>Value</Label>
                  <Input value={String(config.value ?? "")} onChange={(e) => patchConfig("value", e.target.value)} />
                </div>
              )}
              <p className="text-xs text-muted">
                Connect this node's two output handles: green (top) fires when the condition is true, red (bottom) when false.
              </p>
            </>
          )}

          {type === "transform" && (
            <div className="flex flex-col gap-1.5">
              <Label>Set Field</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="field path, e.g. order.status"
                  value={String(Object.keys(config.setFields ?? {})[0] ?? "")}
                  onChange={(e) => {
                    const existingValue = Object.values((config.setFields ?? {}) as Record<string, unknown>)[0] ?? ""
                    patchConfig("setFields", { [e.target.value]: existingValue })
                  }}
                />
                <Input
                  placeholder="value"
                  value={String(Object.values((config.setFields ?? {}) as Record<string, unknown>)[0] ?? "")}
                  onChange={(e) => {
                    const existingKey = Object.keys(config.setFields ?? {})[0] ?? ""
                    patchConfig("setFields", { [existingKey]: e.target.value })
                  }}
                />
              </div>
              <p className="text-xs text-muted">Sets a single field on the workflow's data as it flows through. MVP supports one field per node.</p>
            </div>
          )}

          {type === "setVariable" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Variable (field path)</Label>
                <Input value={String(config.variableName ?? "")} onChange={(e) => patchConfig("variableName", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Value</Label>
                <Input
                  value={String(config.value ?? "")}
                  onChange={(e) => patchConfig("value", e.target.value)}
                  placeholder='Literal value, or "$field.path" to copy another field'
                />
              </div>
            </>
          )}

          {type === "mockApiAction" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Mock Endpoint</Label>
                <Input value={String(config.endpoint ?? "")} onChange={(e) => patchConfig("endpoint", e.target.value)} placeholder="/mock/..." />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>On-Success: Set Field</Label>
                  <Input
                    value={String((config.effect as { field?: string } | undefined)?.field ?? "")}
                    onChange={(e) => patchConfig("effect", { ...(config.effect as object), field: e.target.value })}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>To Value</Label>
                  <Input
                    value={String((config.effect as { value?: unknown } | undefined)?.value ?? "")}
                    onChange={(e) => patchConfig("effect", { ...(config.effect as object), value: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted">
                Test input can set <code>simulate: "TIMEOUT"</code> or <code>"SILENT_FAILURE"</code> to exercise failure paths without a real API.
              </p>
            </>
          )}

          {type === "verifyOutcome" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Field to Verify</Label>
                <Input value={String(config.field ?? "")} onChange={(e) => patchConfig("field", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Expected Value</Label>
                <Input value={String(config.expected ?? "")} onChange={(e) => patchConfig("expected", e.target.value)} />
              </div>
            </>
          )}

          {type === "end" && <p className="text-xs text-muted">Terminal node. No further configuration needed.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onDelete(node.id)} disabled={type === "trigger"}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
