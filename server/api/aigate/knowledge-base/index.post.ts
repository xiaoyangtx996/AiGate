import { eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { probeEmbeddingDim } from '#server/utils/knowledge-embedding'
import { db } from '@/db/drizzle'
import { aiModel, insertKnowledgeBaseSchema, knowledgeBase, storageInstance } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, userId?: string, organizationId?: string | null } | undefined
    const body = await readBody(event)
    const parsed = insertKnowledgeBaseSchema.parse(body)
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, 'Missing organization context', { statusCode: 403 })
    }
    if (!principal?.isAdmin && parsed.organizationId && parsed.organizationId !== principal.organizationId) {
      return responseError(null, 'Cannot create knowledge base in another organization', { statusCode: 403 })
    }
    if (!principal?.isAdmin && parsed.ownerId && parsed.ownerId !== principal?.userId) {
      return responseError(null, 'Cannot assign knowledge base to another owner', { statusCode: 403 })
    }

    const [defaultStorage] = await db.select().from(storageInstance).where(eq(storageInstance.isDefault, true)).limit(1)
    const [embeddingModel] = parsed.embeddingModelId
      ? await db.select().from(aiModel).where(eq(aiModel.id, parsed.embeddingModelId)).limit(1)
      : []

    let embeddingDim = parsed.embeddingDim
    if (!embeddingDim && embeddingModel?.name) {
      embeddingDim = await probeEmbeddingDim(principal.organizationId ?? null, embeddingModel.name)
    }

    const [res] = await db
      .insert(knowledgeBase)
      .values({
        ...parsed,
        storageInstanceId: parsed.storageInstanceId || defaultStorage?.id,
        embeddingDim: embeddingDim || 1536,
        ...(principal?.organizationId && !parsed.organizationId ? { organizationId: principal.organizationId } : {}),
        ...(principal?.userId && !parsed.ownerId ? { ownerId: principal.userId } : {}),
      })
      .returning()
    await auditLog(event, 'knowledge_base.create', { type: 'knowledge_base', id: res?.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
