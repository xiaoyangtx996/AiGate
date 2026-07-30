import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { document, knowledgeBase } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    if (!id)
      throw createError({ statusCode: 400, statusMessage: 'Missing knowledge base ID' })

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id))
    if (!kb)
      throw createError({ statusCode: 404, statusMessage: 'Knowledge base not found' })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const documents = await db
      .select()
      .from(document)
      .where(eq(document.knowledgeBaseId, kb.id))
      .orderBy(asc(document.createdAt))
    return responseSuccess(documents)
  }
  catch (err) {
    return responseError(err)
  }
})
