import { Moon, Sun, UserCircle } from "lucide-react"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/services/api"
import { useFetch } from "@/hooks/useFetch"
import { useAppStore } from "@/store/useAppStore"
import type { UserSummary } from "@/types"

const ROLE_LABELS: Record<string, string> = {
  BUSINESS_ANALYST: "Business Analyst",
  AUTOMATION_DEVELOPER: "Automation Developer",
  BUSINESS_APPROVER: "Business Approver",
}

export function Settings() {
  const { data, loading } = useFetch(() => api.get<{ users: UserSummary[] }>("/users"), [])
  const users = data?.users ?? []
  const currentUser = useAppStore((s) => s.currentUser)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  function switchPersona(u: UserSummary) {
    useAppStore.setState({
      currentUser: { name: u.name, role: ROLE_LABELS[u.role] ?? u.role, initials: u.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() },
    })
  }

  return (
    <div>
      <PageHeader title="Settings" description="Workspace and demo persona configuration." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Theme</p>
              <p className="text-xs text-muted">Applies across the whole workspace and persists on this device.</p>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Demo Persona</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted" />
              <span className="text-sm">
                Currently acting as <span className="font-medium text-[var(--text)]">{currentUser.name}</span> ({currentUser.role})
              </span>
            </div>
            <p className="text-xs text-muted">
              FlowPact uses three seeded demo personas instead of a real auth system. Switching here changes which name appears in the
              topbar and as the default actor for new actions in this browser session.
            </p>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="flex flex-col gap-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => switchPersona(u)}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span>{u.name}</span>
                    <Badge variant="outline">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
