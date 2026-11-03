import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BusinessRule } from "@/types"

const OPERATORS = [
  { value: "EQUALS", label: "Equals" },
  { value: "NOT_EQUALS", label: "Not Equals" },
  { value: "GREATER_THAN", label: "Greater Than" },
  { value: "LESS_THAN", label: "Less Than" },
  { value: "CONTAINS", label: "Contains" },
  { value: "IS_EMPTY", label: "Is Empty" },
  { value: "IS_NOT_EMPTY", label: "Is Not Empty" },
]

type DraftRule = Omit<BusinessRule, "id">

interface RuleBuilderProps {
  rules: DraftRule[]
  onChange: (rules: DraftRule[]) => void
}

export function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  function update(index: number, patch: Partial<DraftRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function remove(index: number) {
    onChange(rules.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...rules, { field: "", operator: "EQUALS", value: "", logicGroup: "AND", order: rules.length }])
  }

  const needsValue = (op: string) => op !== "IS_EMPTY" && op !== "IS_NOT_EMPTY"

  return (
    <div className="flex flex-col gap-2">
      {rules.map((rule, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-slate-50 p-2.5">
          {i > 0 && (
            <Select value={rule.logicGroup} onValueChange={(v) => update(i, { logicGroup: v })}>
              <SelectTrigger className="w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Input
            className="w-[160px]"
            placeholder="Field (e.g. payment.status)"
            value={rule.field}
            onChange={(e) => update(i, { field: e.target.value })}
          />
          <Select value={rule.operator} onValueChange={(v) => update(i, { operator: v })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {needsValue(rule.operator) && (
            <Input
              className="w-[140px]"
              placeholder="Value"
              value={rule.value ?? ""}
              onChange={(e) => update(i, { value: e.target.value })}
            />
          )}
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <Trash2 className="h-4 w-4 text-muted" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add} className="self-start">
        <Plus className="h-3.5 w-3.5" /> Add Rule
      </Button>
    </div>
  )
}
