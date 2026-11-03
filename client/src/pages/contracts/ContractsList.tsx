import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, FileSignature, Search, Copy } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { BusinessContract } from "@/types"

const STATUS_OPTIONS = ["ALL", "DRAFT", "UNDER_REVIEW", "APPROVED", "ACTIVE", "ARCHIVED"]

export function ContractsList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("ALL")

  const { data, loading, error, reload } = useFetch(
    () => api.get<{ contracts: BusinessContract[] }>("/contracts"),
    []
  )

  const contracts = useMemo(() => {
    let list = data?.contracts ?? []
    if (status !== "ALL") list = list.filter((c) => c.status === status)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q))
    }
    return list
  }, [data, status, search])

  async function duplicate(id: string) {
    await api.post(`/contracts/${id}/duplicate`)
    reload()
  }

  return (
    <div>
      <PageHeader
        title="Business Contracts"
        description="Define exactly what an automation must accomplish, what must be satisfied, and what must never happen."
        actions={
          <Button onClick={() => navigate("/contracts/new")}>
            <Plus className="h-4 w-4" /> New Contract
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-8" placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <InlineBanner className="mb-4">Failed to load contracts: {error}</InlineBanner>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No contracts found"
          description="Create a business outcome contract to define what a workflow must accomplish."
          actionLabel="New Contract"
          onAction={() => navigate("/contracts/new")}
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/contracts/${c.id}`)}>
                  <TableCell className="font-medium text-[var(--text)]">{c.name}</TableCell>
                  <TableCell className="text-muted">{c.domain}</TableCell>
                  <TableCell className="text-muted">{c.owner?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted">{c.workflow?.name ?? "Unlinked"}</TableCell>
                  <TableCell className="text-muted">v{c.version}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        duplicate(c.id)
                      }}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
