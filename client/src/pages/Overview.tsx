import { useMemo } from "react"
import {
  Workflow,
  PlayCircle,
  ShieldCheck,
  AlertTriangle,
  FlaskConical,
  CheckSquare,
  TrendingDown,
} from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { PageHeader } from "@/components/shared/PageHeader"
import { KpiCard } from "@/components/shared/KpiCard"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { DashboardKpis } from "@/types"

const PIE_COLORS = ["#16A34A", "#DC2626"]

export function Overview() {
  const { data, loading, error } = useFetch(() => api.get<{ kpis: DashboardKpis }>("/dashboard"), [])
  const kpis = data?.kpis

  const successSplit = useMemo(
    () => [
      { name: "Technical Success", value: kpis?.technicalSuccessRate ?? 0 },
      { name: "Technical Failed", value: 100 - (kpis?.technicalSuccessRate ?? 0) },
    ],
    [kpis]
  )

  const outcomeSplit = useMemo(
    () => [
      { name: "Verified Outcome", value: kpis?.verifiedBusinessOutcomeRate ?? 0 },
      { name: "Unverified / Mismatch", value: 100 - (kpis?.verifiedBusinessOutcomeRate ?? 0) },
    ],
    [kpis]
  )

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Command center for business-verified automation health across the portfolio."
      />

      {error && <InlineBanner className="mb-4">Failed to load dashboard: {error}</InlineBanner>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Automations" value={String(kpis?.totalAutomations ?? 0)} icon={Workflow} />
          <KpiCard label="Active Automations" value={String(kpis?.activeAutomations ?? 0)} icon={PlayCircle} tone="success" />
          <KpiCard label="Executions" value={String(kpis?.executions ?? 0)} icon={PlayCircle} />
          <KpiCard
            label="Technical Success Rate"
            value={`${kpis?.technicalSuccessRate ?? 0}%`}
            icon={ShieldCheck}
            tone="success"
          />
          <KpiCard
            label="Verified Business Outcome Rate"
            value={`${kpis?.verifiedBusinessOutcomeRate ?? 0}%`}
            icon={ShieldCheck}
          />
          <KpiCard label="Failed Business Contracts" value={String(kpis?.failedBusinessContracts ?? 0)} icon={AlertTriangle} tone="error" />
          <KpiCard
            label="Scenarios Passed"
            value={`${kpis?.scenariosPassed ?? 0}/${kpis?.scenariosTotal ?? 0}`}
            icon={FlaskConical}
          />
          <KpiCard label="Pending Approvals" value={String(kpis?.pendingApprovals ?? 0)} icon={CheckSquare} tone="warning" />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Technical Success vs. Verified Business Outcome</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted">
              A workflow can succeed technically while still violating its business contract. FlowPact tracks both.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <MiniPie title="Technical Success Rate" data={successSplit} />
              <MiniPie title="Verified Outcome Rate" data={outcomeSplit} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automations at Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400">
                <TrendingDown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{kpis?.automationsAtRisk ?? 0}</p>
                <p className="text-xs text-muted">Automations with at least one unresolved outcome mismatch</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MiniPie({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div>
      <p className="mb-2 text-center text-xs font-medium text-muted">{title}</p>
      <div className="h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
