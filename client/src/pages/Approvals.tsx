import { useMemo, useState } from "react"
import { CheckSquare } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import { useAppStore } from "@/store/useAppStore"
import type { ApprovalDecision, UserSummary } from "@/types"

export function Approvals() {
  const currentUser = useAppStore((s) => s.currentUser)
  const { data, loading, error, reload } = useFetch(() => api.get<{ approvals: ApprovalDecision[] }>("/approvals"), [])
  const { data: usersData } = useFetch(() => api.get<{ users: UserSummary[] }>("/users"), [])
  const approvals = data?.approvals ?? []
  const users = usersData?.users ?? []

  const [detail, setDetail] = useState<ApprovalDecision | null>(null)
  const [comments, setComments] = useState("")
  const [isException, setIsException] = useState(false)
  const [exceptionReason, setExceptionReason] = useState("")
  const [reviewerId, setReviewerId] = useState("")
  const [decideError, setDecideError] = useState<string | null>(null)

  const approvers = useMemo(() => users.filter((u) => u.role === "BUSINESS_APPROVER"), [users])

  function openDetail(a: ApprovalDecision) {
    setDetail(a)
    setComments("")
    setIsException(false)
    setExceptionReason("")
    setReviewerId(a.reviewerId ?? approvers[0]?.id ?? "")
    setDecideError(null)
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!detail) return
    setDecideError(null)
    try {
      await api.post(`/approvals/${detail.id}/decide`, {
        decision,
        reviewerId,
        comments: comments || undefined,
        isException,
        exceptionReason: exceptionReason || undefined,
      })
      setDetail(null)
      reload()
    } catch (e) {
      setDecideError(e instanceof Error ? e.message : "Decision failed")
    }
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        description="Lightweight release governance. Approval is blocked when the latest test run has failures or the contract lacks acceptance criteria, unless explicitly approved as an authorized exception."
      />

      {error && <InlineBanner className="mb-4">Failed to load approvals: {error}</InlineBanner>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No approval requests yet"
          description="Submit a workflow version for approval from Workflow Studio, or via the API, to see it here."
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Test Summary</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => openDetail(a)}>
                  <TableCell className="font-medium text-[var(--text)]">{a.workflow?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted">v{a.workflowVersion?.versionNum ?? "?"}</TableCell>
                  <TableCell className="text-muted">{a.requester?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted">{a.reviewer?.name ?? "Unassigned"}</TableCell>
                  <TableCell className="text-muted">
                    {a.testSummary ? `${a.testSummary.passedCount}/${a.testSummary.totalScenarios} passed` : "No test run yet"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.workflow?.name}</DialogTitle>
                <div className="flex items-center gap-2 pt-1">
                  <StatusBadge status={detail.status} />
                  <span className="text-xs text-muted">v{detail.workflowVersion?.versionNum}</span>
                </div>
              </DialogHeader>

              {decideError && <InlineBanner className="mb-3 text-sm">{decideError}</InlineBanner>}

              <div className="flex flex-col gap-3 text-sm">
                <p className="text-muted">
                  {detail.testSummary
                    ? `Latest test run: ${detail.testSummary.passedCount}/${detail.testSummary.totalScenarios} scenarios passed (${detail.testSummary.failedCount} failing).`
                    : "No test run has been recorded for this version yet."}
                </p>
                {detail.comments && <p>{detail.comments}</p>}

                {detail.status === "SUBMITTED" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label>Reviewer (acting as {currentUser.name})</Label>
                      <Select value={reviewerId} onValueChange={setReviewerId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Comments</Label>
                      <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input type="checkbox" checked={isException} onChange={(e) => setIsException(e.target.checked)} />
                      Approve as an authorized exception (bypasses the test-failure gate)
                    </label>
                    {isException && (
                      <div className="flex flex-col gap-1.5">
                        <Label>Exception reason (required)</Label>
                        <Textarea value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {detail.status === "SUBMITTED" && (
                <DialogFooter>
                  <Button variant="outline" onClick={() => decide("REJECTED")} disabled={!reviewerId}>
                    Reject
                  </Button>
                  <Button onClick={() => decide("APPROVED")} disabled={!reviewerId || (isException && !exceptionReason)}>
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
