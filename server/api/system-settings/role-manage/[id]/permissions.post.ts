import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { roleMenu } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const roleId = getRouterParam(event, 'id')
    const body = await readBody(event)
    const { permissions } = RolePermissionSchema.parse(body)

    if (!roleId) {
      return responseError(null, '缺少参数 roleId', { statusCode: 400 })
    }

    const res = await db.transaction(async (tx) => {
      await tx.delete(roleMenu).where(eq(roleMenu.roleId, roleId))

      if (permissions.length > 0) {
        return await tx
          .insert(roleMenu)
          .values(
            permissions.map(p => ({
              roleId,
              menuId: p.menuId,
              permissions: p.permissions,
            })),
          )
          .returning()
      }

      return []
    })

    return responseSuccess(res)
  }
  catch (error) {
    return responseError(error)
  }
})
