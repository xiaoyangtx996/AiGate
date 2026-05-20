import { useAuthStore } from '@/stores/auth'

export function useAuth() {
  const store = useAuthStore()

  const hasRole = (roles: string | string[]) => {
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(store.getEffectiveRole())
  }

  const isSysAdmin = () => store.getEffectiveRole() === 'sys_admin'
  const isTenantAdmin = () => store.getEffectiveRole() === 'tenant_admin'
  const isDeptLead = () => store.getEffectiveRole() === 'dept_lead'
  const isProjectLead = () => store.getEffectiveRole() === 'project_lead'
  const isUser = () => store.getEffectiveRole() === 'user'

  return {
    ...store,
    hasRole,
    isSysAdmin,
    isTenantAdmin,
    isDeptLead,
    isProjectLead,
    isUser,
  }
}
