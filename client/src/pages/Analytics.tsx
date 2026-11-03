import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts"
import { PageHeader } from "@/components/shared/PageHeader"
import { InlineBanner } from "@/components/shared/InlineBanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import type { DomainBreakdown, StatusCount, ScenarioCoverageRow } from "@/types"

const PIE_COLORS = ["#6366F1", "#16A34A", "#D97706", "#DC2626", "#64748B"]

export function Analytics() {
  const { data: domainData, loading: l1, error: e1 } = useFetch(() => api.get<{ domains: DomainBreakdown[] }>("/analytics/by-domain"), [])
  const { data: contractStatusData, loading: l2 } = useFetch(() => api.get<{ statuses: StatusCount[] }>("/analytics/contract-status"), [])
  const { data: outcomeStatusData, loading: l3 } = useFetch(() => api.get<{ statuses: StatusCount[] }>("/analytics/outcome-status"), [])
  const { data: approvalData, loading: l4 } = useFetch(() => api.get<{ statuses: StatusCount[] }>("/analytics/approval-funnel"), [])
  const { data: coverageData, loading: l5 } = useFetch(() => api.get<{ rows: ScenarioCoverageRow[] }>("/analytics/scenario-coverage"), [])

  const loading = l1 || l2 || l3 || l4 || l5

  return (
    <div>
      <PageHeader title="Analytics" description="Drill-down views across domains, contract lifecycle, verified outcomes, and rule coverage." />

      {e1 && <InlineBanner className="mb-4">Failed to load analytics: {e1}</InlineBanner>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Workflows &amp; Contracts by Domain</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domainData?.domains ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="domain" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="workflows" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="contracts" fill="#A5B4FC" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contract Lifecycle Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPie data={contractStatusData?.statuses ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outcome Verification Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPie data={outcomeStatusData?.statuses ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusPie data={approvalData?.statuses ?? []} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Business Rule Coverage by Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted">
                Covered rules / total testable rules × 100 — distinct from scenario count, per the Scenario Intelligence coverage definition.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Scenarios</TableHead>
                    <TableHead>Rules Covered</TableHead>
                    <TableHead>Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(coverageData?.rows ?? []).map((r) => (
                    <TableRow key={r.contractId}>
                      <TableCell className="font-medium text-[var(--text)]">{r.name}</TableCell>
                      <TableCell className="text-muted">{r.domain}</TableCell>
                      <TableCell className="text-muted">{r.scenarioCount}</TableCell>
                      <TableCell className="text-muted">
                        {r.coveredRules}/{r.totalRules}
                      </TableCell>
                      <TableCell className="font-medium text-[var(--text)]">{r.coveragePct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function StatusPie({ data }: { data: StatusCount[] }) {
  if (data.length === 0) return <p className="text-xs text-muted">No data yet.</p>
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
