import { useAuthStore, Role } from '@/stores/auth'

interface RoleVisibilityOptions {
  roles: Role[]
  fallback?: boolean
}

export function useRoleVisibility({ roles, fallback = false }: RoleVisibilityOptions) {
  const getEffectiveRole = useAuthStore((state) => state.getEffectiveRole)
  const currentRole = getEffectiveRole()

  const isVisible = roles.includes(currentRole)
  const isHidden = !isVisible

  return {
    isVisible,
    isHidden,
    currentRole,
    show: isVisible ? true : fallback,
  }
}

export function applyRole() {
  const role = useAuthStore.getState().getEffectiveRole()

  document.querySelectorAll('[data-roles]').forEach((el) => {
    const allowedRoles = (el as HTMLElement).dataset.roles?.split(',') || []
    if (allowedRoles.includes(role)) {
      (el as HTMLElement).style.display = ''
    } else {
      (el as HTMLElement).style.display = 'none'
    }
  })
}
