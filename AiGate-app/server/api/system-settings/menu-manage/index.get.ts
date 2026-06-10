/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-04-23 09:05:48
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-05-06 15:35:04
 * @Description: 查询菜单树
 */
import type { InferSelectModel } from 'drizzle-orm'
import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { requireRequestPrincipal } from '#server/utils/context'
import { db } from '@/db/drizzle'
import { menu, roleMenu, userRole } from '@/db/schema'

type MenuRow = InferSelectModel<typeof menu>

function matchesKeyword(row: MenuRow, keyword?: string) {
  if (!keyword)
    return true

  const value = keyword.toLowerCase()
  return row.label.toLowerCase().includes(value) || (row.to?.toLowerCase().includes(value) ?? false)
}

function getMenuWithAncestors(menuById: Map<string, MenuRow>, menuId: string) {
  const ids: string[] = []
  let current = menuById.get(menuId)

  while (current) {
    ids.push(current.id)
    current = current.parentId ? menuById.get(current.parentId) : undefined
  }

  return ids
}

function scopeMenusByRolePermissions(
  menus: MenuRow[],
  permissions: Array<{ menuId: string, permissions: number }>,
  keyword?: string,
) {
  const menuById = new Map(menus.map(item => [item.id, item]))
  const grantedPermissions = new Map<string, number>()

  for (const permission of permissions) {
    grantedPermissions.set(
      permission.menuId,
      (grantedPermissions.get(permission.menuId) ?? 0) | permission.permissions,
    )
  }

  const visibleIds = new Set<string>()
  for (const menuId of grantedPermissions.keys()) {
    const row = menuById.get(menuId)
    if (!row || !matchesKeyword(row, keyword))
      continue

    for (const id of getMenuWithAncestors(menuById, menuId))
      visibleIds.add(id)
  }

  return menus
    .filter(item => visibleIds.has(item.id))
    .map(item => ({
      ...item,
      permissions: grantedPermissions.get(item.id) ?? 0,
    }))
}

export default defineEventHandler(async (event) => {
  try {
    const { keyword, enabled } = MenuQuerySchema.parse(getQuery(event))
    const principal = await requireRequestPrincipal(event)

    const conditions = []

    // keyword 模糊搜索
    if (keyword) {
      conditions.push(
        or(
          ilike(menu.label, `%${keyword}%`),
          ilike(menu.to, `%${keyword}%`),
        ),
      )
    }

    // enabled 精确筛选
    if (enabled !== undefined) {
      conditions.push(
        eq(menu.enabled, enabled),
      )
    }

    const data = await db
      .select()
      .from(menu)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        asc(menu.createdAt),
        desc(menu.sort),
      )

    if (principal.isAdmin) {
      return responseSuccess(convertFlatDataToTree(data))
    }

    let roleIds = principal.roleIds
    if (!roleIds) {
      const rows = await db
        .select({ roleId: userRole.roleId })
        .from(userRole)
        .where(eq(userRole.userId, principal.userId))
      roleIds = rows.map(row => row.roleId)
    }

    if (!roleIds.length) {
      return responseSuccess([])
    }

    const rolePermissions = await db
      .select({
        menuId: roleMenu.menuId,
        permissions: roleMenu.permissions,
      })
      .from(roleMenu)
      .where(inArray(roleMenu.roleId, roleIds))

    return responseSuccess(convertFlatDataToTree(scopeMenusByRolePermissions(data, rolePermissions, keyword)))
  }
  catch (err) {
    return responseError(err)
  }
})
