import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(knowledgeBase.id, id!), eq(knowledgeBase.organizationId, principal.organizationId))
      : eq(knowledgeBase.id, id!)
    const [res] = await db.select().from(knowledgeBase).where(where)
    if (!res)
      return responseError(null, 'Knowledge base not found', { statusCode: 404 })

    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
