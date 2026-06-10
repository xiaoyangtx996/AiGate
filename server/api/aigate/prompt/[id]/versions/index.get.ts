import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt, promptVersion } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const where =
      !principal.isAdmin && principal.organizationId
        ? and(eq(prompt.id, id!), eq(prompt.organizationId, principal.organizationId))
        : eq(prompt.id, id!)
    const [found] = await db.select().from(prompt).where(where)
    if (!found) {
      return responseError(null, 'Prompt 不存在', { statusCode: 404 })
    }

    const versions = await db
      .select()
      .from(promptVersion)
      .where(eq(promptVersion.promptId, id!))
      .orderBy(desc(promptVersion.version))
    return responseSuccess(versions)
  } catch (err) {
    return responseError(err)
  }
})
