import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt, promptVersion } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean; organizationId?: string | null; userId?: string }
      | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!principal.isAdmin && body.organizationId && body.organizationId !== principal.organizationId) {
      return responseError(null, '无权转移 Prompt 到其他组织', { statusCode: 403 })
    }

    const where =
      !principal.isAdmin && principal.organizationId
        ? and(eq(prompt.id, id!), eq(prompt.organizationId, principal.organizationId))
        : eq(prompt.id, id!)
    const [existing] = await db.select().from(prompt).where(where)
    if (!existing) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }

    if (body.content && body.content !== existing.content) {
      const [latest] = await db
        .select()
        .from(promptVersion)
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
  } catch (err) {
    return responseError(err)
  }
})
