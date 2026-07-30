import { and, eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const where = principal?.organizationId
      ? and(eq(apiKey.id, id!), eq(apiKey.organizationId, principal.organizationId))
      : eq(apiKey.id, id!)
    const [res] = await db.delete(apiKey).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    await auditLog(event, 'api_key.delete', { type: 'api_key', id }, res, null)
    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
