import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const where = principal?.organizationId
      ? and(eq(alert.id, id!), eq(alert.organizationId, principal.organizationId))
      : eq(alert.id, id!)
    const [res] = await db.update(alert).set({ read: true }).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
