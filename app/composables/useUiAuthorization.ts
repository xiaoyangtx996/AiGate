import type { PermissionTarget, PermissionValue } from '@/utils/ui-authorization'
import { canUseMenuPermission } from '@/utils/ui-authorization'

export type UiPermissionBinding = PermissionValue | PermissionTarget

function normalizePermissionTarget(binding: UiPermissionBinding, path: string): PermissionTarget {
  return typeof binding === 'string' ? { path, permission: binding } : { path, ...binding }
}

export function useUiAuthorization() {
  const route = useRoute()
  const menuStore = useMenuStore()

  function canAccessPath(path = route.path) {
    return canUseMenuPermission(menuStore.menuTree, { path }, route.path)
  }

  function canUsePermission(binding: UiPermissionBinding, path = route.path) {
    return canUseMenuPermission(menuStore.menuTree, normalizePermissionTarget(binding, path), route.path)
  }

  return {
    canAccessPath,
    canUsePermission,
  }
}
