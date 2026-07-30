import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

const apiKeyStatuses = ['active', 'revoked', 'expired', 'disabled'] as const
type ApiKeyStatus = (typeof apiKeyStatuses)[number]

function isApiKeyStatus(status: unknown): status is ApiKeyStatus {
  return typeof status === 'string' && apiKeyStatuses.includes(status as ApiKeyStatus)
}

export default defineEventHandler(async event => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const conditions = []
    if (principal?.organizationId) conditions.push(eq(apiKey.organizationId, principal.organizationId))
    if (query.keyword) conditions.push(ilike(apiKey.name, `%${query.keyword}%`))
    if (isApiKeyStatus(query.status)) conditions.push(eq(apiKey.status, query.status))
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(apiKey)
      .where(where)
    const data = await db
      .select()
      .from(apiKey)
      .where(where)
      .orderBy(asc(apiKey.createdAt))
      .limit(pageSize)
      .offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  } catch (err) {
    return responseError(err)
  }
})
