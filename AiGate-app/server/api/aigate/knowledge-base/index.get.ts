import { and, asc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const conditions = []
    if (!principal.isAdmin && principal.organizationId)
      conditions.push(eq(knowledgeBase.organizationId, principal.organizationId))
    if (query.keyword)
      conditions.push(ilike(knowledgeBase.name, `%${query.keyword}%`))
    const data = await db.select().from(knowledgeBase).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(knowledgeBase.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
