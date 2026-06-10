import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiLog } from '@/db/schema'

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
    const conditions = [eq(apiLog.userId, principal.userId)]

    if (query.model) conditions.push(ilike(apiLog.model, `%${query.model}%`))
    if (query.agentId) conditions.push(eq(apiLog.agentId, query.agentId as string))
    if (query.status) conditions.push(eq(apiLog.status, query.status as string))

    const where = and(...conditions)
    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(apiLog)
      .where(where)
    const data = await db
      .select()
      .from(apiLog)
      .where(where)
      .orderBy(desc(apiLog.createdAt))
      .limit(pageSize)
      .offset(offset)

    return responseSuccess({ items: data, total: countRow?.total || 0, page, pageSize })
  } catch (err) {
    return responseError(err)
  }
})
