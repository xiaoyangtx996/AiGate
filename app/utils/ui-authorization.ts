import { PERMISSIONS } from '@/enums'

export type PermissionValue = typeof PERMISSIONS.valueType

const trailingSlashPattern = /\/+$/

export interface PermissionTarget {
  path?: string
  permission?: PermissionValue
  anyOf?: PermissionValue[]
  allOf?: PermissionValue[]
}

export interface MenuPermissionNode {
  to?: string | null
  permissions?: number
  children?: MenuPermissionNode[]
}

function normalizePath(path?: string | null) {
  if (!path) return ''

  const cleanPath = path.split('?')[0]?.split('#')[0] ?? ''
  if (!cleanPath || cleanPath === '/') return '/'

  return cleanPath.replace(trailingSlashPattern, '') || '/'
}

function findMenuByPath(nodes: MenuPermissionNode[], path: string): MenuPermissionNode | null {
  const normalizedPath = normalizePath(path)

  for (const node of nodes) {
    const nodePath = normalizePath(node.to)
    const matchesNode =
      nodePath && nodePath !== '/' && !node.children?.length && normalizedPath.startsWith(`${nodePath}/`)

    if (nodePath && nodePath === normalizedPath) return node

    const child = node.children?.length ? findMenuByPath(node.children, normalizedPath) : null
    if (child) return child

    if (matchesNode) return node
  }

  return null
}

function getPermissionBit(permission: PermissionValue) {
  return PERMISSIONS.raw(permission).bits
}

export function hasPermissionBit(bits: number, permission: PermissionValue) {
  return (bits & getPermissionBit(permission)) === getPermissionBit(permission)
}

export function canUseMenuPermission(menuTree: MenuPermissionNode[], target: PermissionTarget, currentPath = '') {
  const path = target.path ?? currentPath
  const menu = findMenuByPath(menuTree, path)

  if (!menu) return false

  if (!target.permission && !target.anyOf?.length && !target.allOf?.length) return true

  const bits = menu.permissions ?? 0

  if (target.permission && !hasPermissionBit(bits, target.permission)) return false

  if (target.anyOf?.length && !target.anyOf.some(permission => hasPermissionBit(bits, permission))) return false

  if (target.allOf?.length && !target.allOf.every(permission => hasPermissionBit(bits, permission))) return false

  return true
}
