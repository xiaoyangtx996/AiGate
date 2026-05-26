import { asc, ilike, and } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(ilike(prompt.name, `%${query.keyword}%`)) }
    const data = await db.select().from(prompt).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(prompt.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
