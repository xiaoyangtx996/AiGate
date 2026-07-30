import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { modelCombo } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const [res] = await db
      .delete(modelCombo)
      .where(
        and(
          eq(modelCombo.id, id!),
          principal.organizationId ? eq(modelCombo.organizationId, principal.organizationId) : isNull(modelCombo.organizationId),
        ),
      )
      .returning()

    if (!res) {
      return responseError(null, 'Combo 不存在或无权操作', { statusCode: 404 })
    }

    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
