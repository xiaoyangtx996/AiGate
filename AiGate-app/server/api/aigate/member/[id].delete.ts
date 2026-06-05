import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { member } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const where = principal?.organizationId
      ? and(eq(member.id, id!), eq(member.organizationId, principal.organizationId))
      : eq(member.id, id!)
    const [res] = await db.delete(member).where(where).returning()
    if (!res) { return responseSuccess(null, '成员不存在或无权操作', 404) }
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
