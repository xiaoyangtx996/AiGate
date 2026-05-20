import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'sys_admin' | 'tenant_admin' | 'dept_lead' | 'project_lead' | 'user'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: Role
  tenantId: string
  tenantName: string
  department?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  simulatedRole: Role | null
  setSimulatedRole: (role: Role | null) => void
  getEffectiveRole: () => Role
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      simulatedRole: null,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true })
        document.documentElement.className = localStorage.getItem('aigate_theme')?.replace(/"/g, '').includes('light')
          ? 'light'
          : localStorage.getItem('aigate_theme')?.replace(/"/g, '').includes('apple')
          ? 'apple'
          : 'dark'
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, simulatedRole: null })
      },

      updateUser: (updates) => {
        const currentUser = get().user
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } })
        }
      },

      setSimulatedRole: (role) => {
        set({ simulatedRole: role })
      },

      getEffectiveRole: () => {
        const { user, simulatedRole } = get()
        return simulatedRole || user?.role || 'user'
      },
    }),
    {
      name: 'aigate_auth',
    }
  )
)
