import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { menu, role, roleMenu } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const roleId = getRouterParam(event, 'id')

    if (!roleId) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    const roleInfo = await db.query.role.findFirst({
      where: eq(role.id, roleId),
      columns: {
        id: true,
      },
    })

    if (!roleInfo) {
      return responseError(null, '角色不存在', { statusCode: 400 })
    }

    const menus = await db
      .select({
        menuId: roleMenu.menuId,
        permissions: roleMenu.permissions,
      })
      .from(roleMenu)
      .leftJoin(menu, eq(roleMenu.menuId, menu.id))
      .where(eq(roleMenu.roleId, roleId))

    return responseSuccess(menus)
  }
  catch (err) {
    return responseError(err)
  }
})
