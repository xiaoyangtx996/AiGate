import { and, asc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(ilike(apiKey.name, `%${query.keyword}%`)) }
    if (query.status) { conditions.push(eq(apiKey.status, query.status as string)) }
    const data = await db.select().from(apiKey).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(apiKey.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
