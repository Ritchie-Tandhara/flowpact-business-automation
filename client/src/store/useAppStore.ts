import { create } from "zustand"

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  theme: "light" | "dark"
  setTheme: (t: "light" | "dark") => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (v: boolean) => void
  currentUser: { name: string; role: string; initials: string }
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  theme: "light",
  setTheme: (t) => set({ theme: t }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (v) => set({ commandPaletteOpen: v }),
  currentUser: { name: "Akshay Narkhede", role: "Business Analyst", initials: "AN" },
}))
