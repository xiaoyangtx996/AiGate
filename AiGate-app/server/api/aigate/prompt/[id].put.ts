import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt, promptVersion } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null, userId?: string } | undefined
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const where = principal?.organizationId
      ? and(eq(prompt.id, id!), eq(prompt.organizationId, principal.organizationId))
      : eq(prompt.id, id!)
    const [existing] = await db.select().from(prompt).where(where)
    if (!existing) { return responseSuccess(null, '资源不存在或无权操作', 404) }

    if (body.content && body.content !== existing.content) {
      const [latest] = await db.select().from(promptVersion)
        .where(eq(promptVersion.promptId, id!))
        .orderBy(desc(promptVersion.version))
        .limit(1)
      await db.insert(promptVersion).values({
        promptId: id!,
        content: existing.content,
        version: (latest?.version || 0) + 1,
        createdBy: principal?.userId,
      })
    }

    const [res] = await db.update(prompt).set(body).where(where).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
