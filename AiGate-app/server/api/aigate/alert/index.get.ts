import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId) { conditions.push(eq(alert.organizationId, principal.organizationId)) }
    if (query.keyword) {
      conditions.push(or(
        ilike(alert.title, `%${query.keyword}%`),
        ilike(alert.message, `%${query.keyword}%`),
      ))
    }
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(alert).where(where)
    const data = await db.select().from(alert).where(where).orderBy(desc(alert.createdAt)).limit(pageSize).offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) { return responseError(err) }
})
