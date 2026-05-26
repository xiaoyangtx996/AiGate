import { asc, ilike, eq, and } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(ilike(mcpTool.name, `%${query.keyword}%`)) }
    if (query.status) { conditions.push(eq(mcpTool.status, query.status as string)) }
    const data = await db.select().from(mcpTool).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(mcpTool.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
