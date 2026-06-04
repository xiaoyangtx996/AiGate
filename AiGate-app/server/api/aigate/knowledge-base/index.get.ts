import { and, asc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId) { conditions.push(eq(knowledgeBase.organizationId, principal.organizationId)) }
    if (query.keyword) { conditions.push(ilike(knowledgeBase.name, `%${query.keyword}%`)) }
    const data = await db.select().from(knowledgeBase).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(knowledgeBase.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
