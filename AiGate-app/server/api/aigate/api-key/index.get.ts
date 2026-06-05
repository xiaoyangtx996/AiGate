import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId) { conditions.push(eq(apiKey.organizationId, principal.organizationId)) }
    if (query.keyword) { conditions.push(ilike(apiKey.name, `%${query.keyword}%`)) }
    if (query.status) { conditions.push(eq(apiKey.status, query.status as string)) }
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(apiKey).where(where)
    const data = await db.select().from(apiKey).where(where).orderBy(asc(apiKey.createdAt)).limit(pageSize).offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) { return responseError(err) }
})
