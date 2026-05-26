import { asc, ilike, and } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(ilike(knowledgeBase.name, `%${query.keyword}%`)) }
    const data = await db.select().from(knowledgeBase).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(knowledgeBase.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
