import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  sidebarOpen: boolean
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setMobileSidebarOpen: (open: boolean) => void
  expandedGroups: string[]
  toggleGroup: (group: string) => void
  activeModal: string | null
  activeDrawer: string | null
  openModal: (id: string) => void
  closeModal: () => void
  openDrawer: (id: string) => void
  closeDrawer: () => void
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  recentSearches: string[]
  addRecentSearch: (term: string) => void
  clearRecentSearches: () => void
}

export interface Toast {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message?: string
  duration?: number
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      sidebarOpen: true,
      mobileSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      expandedGroups: ['data-center', 'org-governance', 'gateway', 'assets', 'agent', 'monitoring'],
      toggleGroup: (group) => {
        const { expandedGroups } = get()
        if (expandedGroups.includes(group)) {
          set({ expandedGroups: expandedGroups.filter((g) => g !== group) })
        } else {
          set({ expandedGroups: [...expandedGroups, group] })
        }
      },

      activeModal: null,
      activeDrawer: null,
      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),
      openDrawer: (id) => set({ activeDrawer: id }),
      closeDrawer: () => set({ activeDrawer: null }),

      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9)
        const newToast = { ...toast, id }
        set((state) => ({ toasts: [...state.toasts, newToast] }))
        const duration = toast.duration || 3000
        setTimeout(() => {
          get().removeToast(id)
        }, duration)
      },
      removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      },

      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),

      recentSearches: [],
      addRecentSearch: (term) => {
        const { recentSearches } = get()
        const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5)
        set({ recentSearches: updated })
      },
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'aigate_ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedGroups: state.expandedGroups,
        recentSearches: state.recentSearches,
      }),
    }
  )
)
