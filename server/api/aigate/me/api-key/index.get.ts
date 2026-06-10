import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

const apiKeyStatuses = ['active', 'revoked', 'expired'] as const
type ApiKeyStatus = (typeof apiKeyStatuses)[number]

function isApiKeyStatus(status: unknown): status is ApiKeyStatus {
  return typeof status === 'string' && apiKeyStatuses.includes(status as ApiKeyStatus)
}

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const conditions = [eq(apiKey.userId, principal.userId)]

    if (query.keyword) {
      conditions.push(ilike(apiKey.name, `%${query.keyword}%`))
    }
    if (isApiKeyStatus(query.status)) {
      conditions.push(eq(apiKey.status, query.status))
    }

    const where = and(...conditions)
    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(apiKey)
      .where(where)
    const data = await db
      .select()
      .from(apiKey)
      .where(where)
      .orderBy(desc(apiKey.createdAt))
      .limit(pageSize)
      .offset(offset)

    return responseSuccess({ items: data, total: countRow?.total || 0, page, pageSize })
  } catch (err) {
    return responseError(err)
  }
})
