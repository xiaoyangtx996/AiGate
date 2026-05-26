import { desc, eq, and, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiLog } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.model) { conditions.push(ilike(apiLog.model, `%${query.model}%`)) }
    if (query.status) { conditions.push(eq(apiLog.status, query.status as string)) }
    const data = await db.select().from(apiLog).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(apiLog.createdAt)).limit(200)
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
