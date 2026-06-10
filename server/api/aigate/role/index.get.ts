import { and, asc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { role } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) {
      conditions.push(or(ilike(role.name, `%${query.keyword}%`), ilike(role.code, `%${query.keyword}%`)))
    }
    if (query.enabled !== undefined) {
      conditions.push(eq(role.enabled, query.enabled === 'true'))
    }
    const data = await db
      .select()
      .from(role)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(role.sort))
    return responseSuccess(data)
  } catch (err) {
    return responseError(err)
  }
})
