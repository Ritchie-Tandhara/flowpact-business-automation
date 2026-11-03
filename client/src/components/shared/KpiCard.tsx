import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: { value: string; direction: "up" | "down"; positive?: boolean }
  tone?: "default" | "success" | "warning" | "error"
}

const TONE_MAP: Record<string, string> = {
  default: "bg-indigo/10 text-indigo",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
}

export function KpiCard({ label, value, icon: Icon, trend, tone = "default" }: KpiCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">{label}</span>
          <span className="text-2xl font-semibold tracking-tight text-[var(--text)]">{value}</span>
        </div>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_MAP[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "flex items-center gap-0.5 font-medium",
              trend.positive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend.value}
          </span>
          <span className="text-muted">vs last period</span>
        </div>
      )}
    </Card>
  )
}
