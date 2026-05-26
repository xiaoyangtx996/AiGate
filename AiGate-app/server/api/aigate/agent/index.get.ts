import { asc, ilike, eq, and } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(ilike(agent.name, `%${query.keyword}%`)) }
    const data = await db.select().from(agent).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(agent.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
