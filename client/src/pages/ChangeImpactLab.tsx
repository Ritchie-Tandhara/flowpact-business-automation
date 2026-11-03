import { useMemo, useState } from "react"
import { GitCompareArrows } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { ChangeSimulation } from "@/types"

const FILTERS = ["ALL", "IMPROVED", "REGRESSED", "UNCHANGED"] as const

const CHANGE_VARIANT: Record<string, "success" | "error" | "outline"> = {
  IMPROVED: "success",
  REGRESSED: "error",
  UNCHANGED: "outline",
}

export function ChangeImpactLab() {
  const { data, loading, error } = useFetch(() => api.get<{ simulations: ChangeSimulation[] }>("/simulations"), [])
  const [simId, setSimId] = useState<string>("")
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL")

  const simulations = data?.simulations ?? []
  const activeSim = simulations.find((s) => s.id === simId) ?? simulations[0]

  const rows = useMemo(() => {
    if (!activeSim) return []
    if (filter === "ALL") return activeSim.resultDetail
    return activeSim.resultDetail.filter((r) => r.change === filter)
  }, [activeSim, filter])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error) {
    return <InlineBanner>Failed to load simulations: {error}</InlineBanner>
  }

  return (
    <div>
      <PageHeader
        title="Change Impact Lab"
        description="Compare a baseline workflow version against a proposed version using the same synthetic test dataset before publishing."
      />

      {simulations.length === 0 || !activeSim ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No change simulations yet"
          description="A simulation is created when a proposed workflow version is run against the same scenarios as its baseline."
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <Select value={activeSim.id} onValueChange={setSimId}>
              <SelectTrigger className="w-96">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {simulations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.workflow?.name ?? "Workflow"}: v{s.baselineVersion.versionNum} → v{s.proposedVersion.versionNum}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Total Scenarios" value={activeSim.totalScenarios} />
            <StatCard label="Unchanged" value={activeSim.unchangedCount} />
            <StatCard label="Improved" value={activeSim.improvedCount} tone="success" />
            <StatCard label="Regressed" value={activeSim.regressedCount} tone="error" />
            <StatCard label="Newly Violated Contracts" value={activeSim.newlyViolatedCount} tone="error" />
          </div>

          <div className="mb-4 flex items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                  (filter === f
                    ? "border-indigo bg-indigo/10 text-indigo"
                    : "border-[var(--border)] text-muted hover:bg-slate-50 dark:hover:bg-slate-800")
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Baseline Decision</TableHead>
                  <TableHead>Proposed Decision</TableHead>
                  <TableHead>Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-[var(--text)]">{r.scenario}</TableCell>
                    <TableCell className="text-muted">{r.baselineDecision}</TableCell>
                    <TableCell className="text-muted">{r.proposedDecision}</TableCell>
                    <TableCell>
                      <Badge variant={CHANGE_VARIANT[r.change]}>{r.change}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "error" }) {
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
