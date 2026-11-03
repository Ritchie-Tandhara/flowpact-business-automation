import { useLocation } from "react-router-dom"
import { Search, Command, Bell, HelpCircle, Plus, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAppStore } from "@/store/useAppStore"

const ROUTE_LABELS: Record<string, string> = {
  "/": "Overview",
  "/contracts": "Business Contracts",
  "/studio": "Workflow Studio",
  "/scenarios": "Scenario Intelligence",
  "/impact-lab": "Change Impact Lab",
  "/executions": "Execution Center",
  "/outcomes": "Outcome Assurance",
  "/approvals": "Approvals",
  "/analytics": "Analytics",
  "/settings": "Settings",
}

export function Topbar() {
  const location = useLocation()
  const currentUser = useAppStore((s) => s.currentUser)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const label = ROUTE_LABELS[location.pathname] ?? "FlowPact"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)] px-5">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Demo Workspace</span>
        <span className="text-muted">/</span>
        <span className="font-medium text-[var(--text)]">{label}</span>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <button className="flex h-9 w-64 items-center gap-2 rounded-md border border-[var(--border)] px-3 text-sm text-muted hover:bg-slate-50 dark:hover:bg-slate-800 focus-ring">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <span className="flex items-center gap-0.5 rounded border border-[var(--border)] px-1 text-[10px]">
            <Command className="h-2.5 w-2.5" /> K
          </span>
        </button>

        <Button size="sm" variant="secondary">
          <Plus className="h-3.5 w-3.5" /> Quick Create
        </Button>

        <Button size="icon" variant="ghost" onClick={toggleTheme} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost">
          <Bell className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost">
          <HelpCircle className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="focus-ring rounded-full">
              <Avatar>
                <AvatarFallback>{currentUser.initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
            <DropdownMenuItem disabled className="text-muted">{currentUser.role}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Switch persona</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
