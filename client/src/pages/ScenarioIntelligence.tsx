import { Fragment, useMemo, useState } from "react"
import { FlaskConical, Play, ChevronDown, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { BusinessContract, TestScenario } from "@/types"

interface RunSuiteResponse {
  totalScenarios: number
  passedCount: number
  failedCount: number
  ruleCoverage: number
}

export function ScenarioIntelligence() {
  const { data: contractsData, loading: contractsLoading } = useFetch(
    () => api.get<{ contracts: BusinessContract[] }>("/contracts"),
    []
  )
  const [contractId, setContractId] = useState<string>("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runSummary, setRunSummary] = useState<RunSuiteResponse | null>(null)

  const contracts = contractsData?.contracts ?? []
  const activeContractId = contractId || contracts[0]?.id || ""

  const {
    data: scenariosData,
    loading: scenariosLoading,
    reload,
  } = useFetch(
    () =>
      activeContractId
        ? api.get<{ scenarios: TestScenario[] }>(`/scenarios?contractId=${activeContractId}`)
        : Promise.resolve({ scenarios: [] }),
    [activeContractId]
  )

  const scenarios = scenariosData?.scenarios ?? []
  const selectedContract = contracts.find((c) => c.id === activeContractId)

  const stats = useMemo(() => {
    const total = scenarios.length
    const passed = scenarios.filter((s) => s.latestResult?.status === "PASSED").length
    const failed = scenarios.filter((s) => s.latestResult?.status === "FAILED").length
    const notRun = total - passed - failed
    return { total, passed, failed, notRun }
  }, [scenarios])

  async function runSuite() {
    if (!activeContractId) return
    setRunning(true)
    setRunError(null)
    try {
      const result = await api.post<RunSuiteResponse>("/scenarios/run-suite", { contractId: activeContractId })
      setRunSummary(result)
      reload()
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Failed to run scenario suite")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Scenario Intelligence"
        description="Positive, negative, boundary, and exception test cases, linked to the business contract they validate."
        actions={
          <Button onClick={runSuite} disabled={!activeContractId || running}>
            <Play className="h-4 w-4" /> {running ? "Running..." : "Run Suite"}
          </Button>
        }
      />

      {contractsLoading ? (
        <Skeleton className="h-10 w-72" />
      ) : contracts.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No contracts yet" description="Create a business contract first, then attach scenarios to it." />
      ) : (
        <div className="mb-4 flex items-center gap-3">
          <Select value={activeContractId} onValueChange={(v) => { setContractId(v); setRunSummary(null) }}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Select a contract" />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedContract?.workflow ? (
            <Badge variant="indigo">Linked to {selectedContract.workflow.name}</Badge>
          ) : (
            <Badge variant="warning">No workflow linked — suite run disabled server-side</Badge>
          )}
        </div>
      )}

      {runError && <InlineBanner className="mb-4">{runError}</InlineBanner>}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Scenarios" value={stats.total} />
        <StatCard label="Passed" value={stats.passed} tone="success" />
        <StatCard label="Failed" value={stats.failed} tone="error" />
        <StatCard label="Rule Coverage" value={runSummary ? `${runSummary.ruleCoverage}%` : "—"} />
      </div>

      {scenariosLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No scenarios for this contract" description="Add positive, negative, boundary, and exception scenarios to validate this contract's business rules." />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Scenario</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Expected Decision</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((s) => (
                <Fragment key={s.id}>
                  <TableRow className="cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    <TableCell>
                      {expanded === s.id ? <ChevronDown className="h-4 w-4 text-muted" /> : <ChevronRight className="h-4 w-4 text-muted" />}
                    </TableCell>
                    <TableCell className="font-medium text-[var(--text)]">{s.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.testType}</Badge>
                    </TableCell>
                    <TableCell className="text-muted">{s.expectedDecision}</TableCell>
                    <TableCell>
                      {s.latestResult ? <StatusBadge status={s.latestResult.status} /> : <StatusBadge status="NOT_RUN" />}
                    </TableCell>
                  </TableRow>
                  {expanded === s.id && (
                    <TableRow className="bg-slate-50/60 dark:bg-slate-800/40">
                      <TableCell />
                      <TableCell colSpan={4}>
                        <ScenarioDetail scenario={s} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "success" | "error" }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={
          "mt-1 text-xl font-semibold " +
          (tone === "success"
            ? "text-green-700 dark:text-green-400"
            : tone === "error"
              ? "text-red-700 dark:text-red-400"
              : "text-[var(--text)]")
        }
      >
        {value}
      </p>
    </Card>
  )
}

function ScenarioDetail({ scenario }: { scenario: TestScenario }) {
  return (
    <div className="grid grid-cols-1 gap-4 py-2 md:grid-cols-2">
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Input Data</p>
        <pre className="max-h-40 overflow-auto rounded-md bg-slate-900 p-2 text-[11px] text-slate-100">
          {JSON.stringify(scenario.inputData, null, 2)}
        </pre>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Expected Outcome</p>
        <p className="mb-3 text-sm">{scenario.expectedOutcome}</p>
        {scenario.latestResult ? (
          <>
            <p className="mb-1 text-xs font-medium text-muted">Execution Trace (Business Rule Evaluation)</p>
            <div className="flex flex-col gap-1">
              {scenario.latestResult.executionTrace.map((d, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs">
                  <span>
                    {d.field} {d.operator} {d.value ?? ""}
                  </span>
                  <Badge variant={d.passed ? "success" : "error"}>{d.passed ? "Passed" : "Failed"}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{scenario.latestResult.actualOutcome}</p>
          </>
        ) : (
          <p className="text-xs text-muted">Not yet run. Click "Run Suite" to evaluate this scenario against the contract's business rules.</p>
        )}
      </div>
    </div>
  )
}
