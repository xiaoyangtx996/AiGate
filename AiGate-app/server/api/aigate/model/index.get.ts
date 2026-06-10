import { and, asc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { aiModel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const conditions = []
    if (query.keyword)

      conditions.push(or(ilike(aiModel.name, `%${query.keyword}%`), ilike(aiModel.provider, `%${query.keyword}%`)))
    if (query.status)

      conditions.push(eq(aiModel.status, query.status as string))
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(aiModel).where(where)
    const data = await db.select().from(aiModel).where(where).orderBy(asc(aiModel.name)).limit(pageSize).offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) { return responseError(err) }
})
