import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
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

    const docTable = (kb as any).documents || []
    return responseSuccess({
      knowledgeBase: { id: kb.id, name: kb.name, status: kb.status },
      documents: docTable,
      total: docTable.length,
    })
  }
  catch (err) { return responseError(err) }
})
