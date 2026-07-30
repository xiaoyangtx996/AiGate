import { and, eq } from 'drizzle-orm'
import { enqueueKnowledgeDocument } from '#server/utils/knowledge-jobs'
import { db } from '@/db/drizzle'
import { document, knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    const id = getRouterParam(event, 'id')
    const docId = getRouterParam(event, 'docId')
    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id!))
    if (!kb)
      return responseError(null, '知识库不存在', { statusCode: 404 })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }
    const [doc] = await db
      .select()
      .from(document)
      .where(and(eq(document.id, docId!), eq(document.knowledgeBaseId, kb.id)))
    if (!doc)
      return responseError(null, '文档不存在', { statusCode: 404 })
    await db
      .update(document)
      .set({ status: 'uploaded', errorMsg: null, errorMessage: null })
      .where(eq(document.id, doc.id))
    await enqueueKnowledgeDocument(doc.id)
    return responseSuccess({ id: doc.id, retried: true })
  }
  catch (err) {
    return responseError(err)
  }
})
