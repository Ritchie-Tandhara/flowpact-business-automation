import { NavLink } from "react-router-dom"
import {
  LayoutDashboard,
  FileSignature,
  Workflow,
  FlaskConical,
  GitCompareArrows,
  PlayCircle,
  ShieldCheck,
  CheckSquare,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"

const NAV_ITEMS = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/contracts", label: "Business Contracts", icon: FileSignature },
  { to: "/studio", label: "Workflow Studio", icon: Workflow },
  { to: "/scenarios", label: "Scenario Intelligence", icon: FlaskConical },
  { to: "/impact-lab", label: "Change Impact Lab", icon: GitCompareArrows },
  { to: "/executions", label: "Execution Center", icon: PlayCircle },
  { to: "/outcomes", label: "Outcome Assurance", icon: ShieldCheck },
  { to: "/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[var(--border)] bg-[var(--card)] transition-[width] duration-200",
        sidebarCollapsed ? "w-[64px]" : "w-[232px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo text-white">
          <Zap className="h-4 w-4" />
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight text-[var(--text)]">FlowPact</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo/10 text-indigo"
                      : "text-[var(--muted)] hover:bg-slate-100 hover:text-[var(--text)]"
                  )
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-[var(--border)] p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md py-2 text-muted hover:bg-slate-100 hover:text-[var(--text)] focus-ring"
        >
          {sidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
