import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { skill } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const conditions = []

    if (!principal.isAdmin && principal.organizationId)
      conditions.push(eq(skill.organizationId, principal.organizationId))
    if (query.keyword)
      conditions.push(ilike(skill.name, `%${query.keyword}%`))
    if (query.enabled !== undefined)
      conditions.push(eq(skill.enabled, query.enabled === 'true'))

    const where = conditions.length ? and(...conditions) : undefined
    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(skill).where(where)
    const data = await db.select().from(skill).where(where).orderBy(asc(skill.createdAt)).limit(pageSize).offset(offset)

    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) {
    return responseError(err)
  }
})
