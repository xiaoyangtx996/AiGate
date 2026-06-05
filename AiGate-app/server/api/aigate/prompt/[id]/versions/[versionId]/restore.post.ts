import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt, promptVersion } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null, userId?: string } | undefined
    const promptId = getRouterParam(event, 'id')
    const versionId = getRouterParam(event, 'versionId')
    const where = principal?.organizationId
      ? and(eq(prompt.id, promptId!), eq(prompt.organizationId, principal.organizationId))
      : eq(prompt.id, promptId!)
    const [found] = await db.select().from(prompt).where(where)
    if (!found) { return responseSuccess(null, 'Prompt 不存在', 404) }

    const [version] = await db.select().from(promptVersion)
      .where(and(eq(promptVersion.id, versionId!), eq(promptVersion.promptId, promptId!)))
    if (!version) { return responseSuccess(null, '版本不存在', 404) }

    const [latest] = await db.select().from(promptVersion)
      .where(eq(promptVersion.promptId, promptId!))
      .orderBy(desc(promptVersion.version))
      .limit(1)
    const nextVersion = (latest?.version || 0) + 1

    await db.insert(promptVersion).values({
      promptId: promptId!,
      content: found.content,
      version: nextVersion,
      createdBy: principal?.userId,
    })

    const [res] = await db.update(prompt).set({ content: version.content }).where(where).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
