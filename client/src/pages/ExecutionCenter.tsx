import { useMemo, useState } from "react"
import { PlayCircle, Search } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { ExecutionRecord } from "@/types"

const TECHNICAL_OPTIONS = ["ALL", "SUCCESS", "FAILED", "ERROR"]

export function ExecutionCenter() {
  const [search, setSearch] = useState("")
  const [technicalStatus, setTechnicalStatus] = useState("ALL")
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data, loading, error } = useFetch(() => api.get<{ executions: ExecutionRecord[] }>("/executions"), [])
  const { data: detailData } = useFetch(
    () =>
      detailId
        ? api.get<{ execution: ExecutionRecord }>(`/executions/${detailId}`)
        : Promise.resolve<{ execution: ExecutionRecord | null }>({ execution: null }),
    [detailId]
  )

  const executions = useMemo(() => {
    let list = data?.executions ?? []
    if (technicalStatus !== "ALL") list = list.filter((e) => e.technicalStatus === technicalStatus)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((e) => e.workflow?.name.toLowerCase().includes(q))
    }
    return list
  }, [data, technicalStatus, search])

  return (
    <div>
      <PageHeader
        title="Execution Center"
        description="Monitor executions with node-level traces. Technical success and verified business outcome are tracked separately."
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-8" placeholder="Search by workflow..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={technicalStatus} onValueChange={setTechnicalStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TECHNICAL_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "ALL" ? "All Technical Status" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <InlineBanner className="mb-4">Failed to load executions: {error}</InlineBanner>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <EmptyState icon={PlayCircle} title="No executions yet" description="Executions are generated when a published workflow runs." />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Technical Status</TableHead>
                <TableHead>Business Outcome</TableHead>
                <TableHead>Error Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setDetailId(e.id)}>
                  <TableCell className="font-medium text-[var(--text)]">{e.workflow?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted">{new Date(e.startedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-muted">
                    {e.completedAt ? `${new Date(e.completedAt).getTime() - new Date(e.startedAt).getTime()}ms` : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.technicalStatus} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.businessOutcomeStatus} />
                  </TableCell>
                  <TableCell className="text-muted">{e.errorCategory ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-xl">
          {detailData?.execution && (
            <>
              <DialogHeader>
                <DialogTitle>{detailData.execution.workflow?.name}</DialogTitle>
                <div className="flex items-center gap-2 pt-1">
                  <StatusBadge status={detailData.execution.technicalStatus} />
                  <StatusBadge status={detailData.execution.businessOutcomeStatus} />
                </div>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted">Node Timeline</p>
                {(detailData.execution.nodeTraces ?? []).map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t.nodeType}</Badge>
                      <span>{t.nodeName}</span>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
                {detailData.execution.nodeTraces?.some((t) => t.errorMessage) && (
                  <InlineBanner className="mt-1 text-xs">
                    {detailData.execution.nodeTraces?.find((t) => t.errorMessage)?.errorMessage}
                  </InlineBanner>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
