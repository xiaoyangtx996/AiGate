import { asc, eq, ilike, or, and } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { aiModel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(or(ilike(aiModel.name, `%${query.keyword}%`), ilike(aiModel.provider, `%${query.keyword}%`))) }
    const data = await db.select().from(aiModel).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(aiModel.name))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
