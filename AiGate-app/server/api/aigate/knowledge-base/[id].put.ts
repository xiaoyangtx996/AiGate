import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const where = principal?.organizationId
      ? and(eq(knowledgeBase.id, id!), eq(knowledgeBase.organizationId, principal.organizationId))
      : eq(knowledgeBase.id, id!)
    const [res] = await db.update(knowledgeBase).set(body).where(where).returning()
    if (!res) { return responseSuccess(null, '资源不存在或无权操作', 404) }
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
