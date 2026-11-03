import { useMemo, useState } from "react"
import { ShieldCheck, RefreshCw, Search } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { OutcomeVerification } from "@/types"

const STATUS_OPTIONS = ["ALL", "VERIFIED", "MISMATCH", "PENDING_VERIFICATION", "UNABLE_TO_VERIFY"]

export function OutcomeAssurance() {
  const [status, setStatus] = useState("ALL")
  const [search, setSearch] = useState("")
  const [detail, setDetail] = useState<OutcomeVerification | null>(null)
  const [note, setNote] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, reload } = useFetch(
    () => api.get<{ outcomes: OutcomeVerification[] }>("/outcomes"),
    []
  )

  const outcomes = useMemo(() => {
    let list = data?.outcomes ?? []
    if (status !== "ALL") list = list.filter((o) => o.status === status)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) => o.contract?.name.toLowerCase().includes(q))
    }
    return list
  }, [data, status, search])

  async function reverify(id: string) {
    setActionError(null)
    try {
      await api.post(`/outcomes/${id}/reverify`)
      reload()
      setDetail(null)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Reverification failed")
    }
  }

  async function resolve(id: string, resolutionStatus: "RESOLVED" | "ACCEPTED_RISK") {
    setActionError(null)
    try {
      await api.patch(`/outcomes/${id}/resolution`, { resolutionStatus, note })
      reload()
      setDetail(null)
      setNote("")
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update resolution")
    }
  }

  return (
    <div>
      <PageHeader
        title="Outcome Assurance Ledger"
        description="Verifies that completed workflows achieved their intended business outcome — not merely that their nodes returned successful responses."
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <Input className="pl-8" placeholder="Search by contract..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
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

      {error && <InlineBanner className="mb-4">Failed to load outcome ledger: {error}</InlineBanner>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : outcomes.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No outcome records" description="Run executions to generate outcome verification records against business contracts." />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Verified At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outcomes.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => setDetail(o)}>
                  <TableCell className="font-medium text-[var(--text)]">{o.contract?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted">{o.contract?.domain ?? "—"}</TableCell>
                  <TableCell className="text-muted">{new Date(o.verifiedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-muted">{o.resolutionStatus.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reverify"
                      onClick={(e) => {
                        e.stopPropagation()
                        reverify(o.id)
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.contract?.name}</DialogTitle>
                <div className="flex items-center gap-2 pt-1">
                  <StatusBadge status={detail.status} />
                  <span className="text-xs text-muted">Resolution: {detail.resolutionStatus.replace(/_/g, " ")}</span>
                </div>
              </DialogHeader>

              {actionError && <InlineBanner className="mb-3">{actionError}</InlineBanner>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">Expected State</p>
                  <pre className="max-h-32 overflow-auto rounded-md bg-slate-900 p-2 text-[11px] text-slate-100">
                    {JSON.stringify(detail.expectedState, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted">Observed State</p>
                  <pre className="max-h-32 overflow-auto rounded-md bg-slate-900 p-2 text-[11px] text-slate-100">
                    {JSON.stringify(detail.observedState, null, 2)}
                  </pre>
                </div>
              </div>

              {detail.mismatchReason && (
                <InlineBanner variant="warning" className="mt-3 text-xs">
                  {detail.mismatchReason}
                </InlineBanner>
              )}

              {detail.status === "MISMATCH" && (
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted">Resolution note (required to close out a mismatch)</p>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was found, and why is this acceptable or fixed?" />
                </div>
              )}

              <DialogFooter>
                <Button variant="secondary" onClick={() => reverify(detail.id)}>
                  <RefreshCw className="h-4 w-4" /> Reverify
                </Button>
                {detail.status === "MISMATCH" && (
                  <>
                    <Button variant="outline" onClick={() => resolve(detail.id, "ACCEPTED_RISK")} disabled={!note.trim()}>
                      Accept Risk
                    </Button>
                    <Button onClick={() => resolve(detail.id, "RESOLVED")} disabled={!note.trim()}>
                      Mark Resolved
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
