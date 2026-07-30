import { and, eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { knowledgeBase, updateKnowledgeBaseSchema } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null; userId?: string } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = updateKnowledgeBaseSchema.parse(body)
    const {
      embeddingModel: _embeddingModel,
      embeddingModelId: _embeddingModelId,
      embeddingDim: _embeddingDim,
      ...updates
    } = parsed
    const where =
      !principal.isAdmin && principal.organizationId
        ? and(eq(knowledgeBase.id, id!), eq(knowledgeBase.organizationId, principal.organizationId))
        : eq(knowledgeBase.id, id!)
    const [before] = principal.userId ? await db.select().from(knowledgeBase).where(where) : []
    const [res] = await db.update(knowledgeBase).set(updates).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    await auditLog(event, 'knowledge_base.update', { type: 'knowledge_base', id }, before ?? null, res)
    return responseSuccess(res)
  } catch (err) {
    return responseError(err)
  }
})
