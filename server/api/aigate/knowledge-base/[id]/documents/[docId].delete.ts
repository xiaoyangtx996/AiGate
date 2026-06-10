import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const docId = getRouterParam(event, 'docId')
    if (!id || !docId) throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id))
    if (!kb) throw createError({ statusCode: 404, statusMessage: 'Knowledge base not found' })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    return responseSuccess({ message: 'Document deleted', docId })
  } catch (err) {
    return responseError(err)
  }
})
