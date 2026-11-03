import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TagListEditorProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
}

export function TagListEditor({ items, onChange, placeholder }: TagListEditorProps) {
  const [draft, setDraft] = useState("")

  function add() {
    const value = draft.trim()
    if (!value) return
    onChange([...items, value])
    setDraft("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-slate-50 px-3 py-1.5 text-sm">
            <span className="flex-1">{item}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-muted hover:text-error focus-ring rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-muted">None added yet.</p>}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  )
}
