import { eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { rebuildKnowledgeBaseVectors } from '#server/utils/knowledge-rag'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id!))
    if (!kb)
      return responseError(null, '知识库不存在', { statusCode: 404 })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const result = await rebuildKnowledgeBaseVectors(kb.id)
    await auditLog(event, 'knowledge_base.rebuild_vectors', { type: 'knowledge_base', id: kb.id }, kb, { ...kb, rebuiltDocuments: result.total })
    return responseSuccess(result)
  }
  catch (err) {
    return responseError(err)
  }
})
