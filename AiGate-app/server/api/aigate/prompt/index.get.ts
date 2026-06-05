import { and, asc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId) { conditions.push(eq(prompt.organizationId, principal.organizationId)) }
    if (query.keyword) { conditions.push(ilike(prompt.name, `%${query.keyword}%`)) }
    const data = await db.select().from(prompt).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(prompt.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
