import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!principal.isAdmin && body.organizationId && body.organizationId !== principal.organizationId) {
      return responseError(null, '无权转移 Agent 到其他组织', { statusCode: 403 })
    }

    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(agent.id, id!), eq(agent.organizationId, principal.organizationId))
      : eq(agent.id, id!)
    const [res] = await db.update(agent).set(body).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
