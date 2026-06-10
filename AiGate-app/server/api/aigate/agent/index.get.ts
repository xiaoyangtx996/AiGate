import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const conditions = []
    if (!principal.isAdmin && principal.organizationId)
      conditions.push(eq(agent.organizationId, principal.organizationId))

    if (query.keyword)
      conditions.push(ilike(agent.name, `%${query.keyword}%`))
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(agent).where(where)
    const data = await db.select().from(agent).where(where).orderBy(asc(agent.createdAt)).limit(pageSize).offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) { return responseError(err) }
})
