import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const where = principal?.organizationId
      ? and(eq(channel.id, id!), eq(channel.organizationId, principal.organizationId))
      : eq(channel.id, id!)
    const [res] = await db.update(channel).set(body).where(where).returning()
    if (!res) { return responseSuccess(null, '资源不存在或无权操作', 404) }
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
