import { db } from '@/db/drizzle'
import { insertKnowledgeBaseSchema, knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const body = await readBody(event)
    const parsed = insertKnowledgeBaseSchema.parse(body)
    const [res] = await db.insert(knowledgeBase).values({
      ...parsed,
      ...(principal?.organizationId && !parsed.organizationId ? { organizationId: principal.organizationId } : {}),
    }).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
