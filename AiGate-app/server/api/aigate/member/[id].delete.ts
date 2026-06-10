import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { member } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(member.id, id!), eq(member.organizationId, principal.organizationId))
      : eq(member.id, id!)
    const [res] = await db.delete(member).where(where).returning()
    if (!res) {
      return responseError(null, '成员不存在或无权操作', { statusCode: 404 })
    }
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
