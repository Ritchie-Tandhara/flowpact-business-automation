import { create } from "zustand"

type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("flowpact-theme")
    if (stored === "light" || stored === "dark") return stored
  } catch {
    /* ignore (private browsing, blocked storage) */
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return "dark"
  }
  return "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
  try {
    localStorage.setItem("flowpact-theme", theme)
  } catch {
    /* ignore */
  }
}

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  currentUser: { name: string; role: string; initials: string }
}

const initialTheme = getInitialTheme()
if (typeof document !== "undefined") applyTheme(initialTheme)

export const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  theme: initialTheme,
  setTheme: (t) => {
    applyTheme(t)
    set({ theme: t })
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark"
    applyTheme(next)
    set({ theme: next })
  },
  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  currentUser: { name: "Akshay Narkhede", role: "Business Analyst", initials: "AN" },
}))
