import { and, eq } from 'drizzle-orm'
import { loadAgentBindings } from '#server/utils/agent-bindings'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(agent.id, id!), eq(agent.organizationId, principal.organizationId))
      : eq(agent.id, id!)
    const [res] = await db.select().from(agent).where(where)
    if (!res)
      return responseError(null, 'Agent not found', { statusCode: 404 })

    const bindings = await loadAgentBindings(res.id)
    return responseSuccess({ ...res, ...bindings })
  }
  catch (err) {
    return responseError(err)
  }
})
