import { and, eq } from 'drizzle-orm'
import {
  normalizeAgentBindingInput,
  validateAgentBindings,
  writeAgentBindings,
} from '#server/utils/agent-bindings'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null, userId?: string } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!principal.isAdmin && body?.organizationId && body.organizationId !== principal.organizationId)
      return responseError(null, 'Cannot move agent to another organization', { statusCode: 403 })

    const bindings = await validateAgentBindings(normalizeAgentBindingInput(body || {}), principal)
    const patch = {
      ...body,
      knowledgeBases: bindings.knowledgeBaseIds,
      tools: bindings.toolIds,
    }
    delete patch.knowledgeBaseIds
    delete patch.toolIds
    delete patch.skillIds
    delete patch.id
    delete patch.createdAt
    delete patch.updatedAt

    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(agent.id, id!), eq(agent.organizationId, principal.organizationId))
      : eq(agent.id, id!)
    const [before] = principal.userId ? await db.select().from(agent).where(where) : []

    const res = await db.transaction(async (tx) => {
      const [updated] = await tx.update(agent).set(patch).where(where).returning()
      if (!updated)
        return null
      await writeAgentBindings(tx, updated.id, bindings)
      return updated
    })
    if (!res)
      return responseError(null, 'Agent not found', { statusCode: 404 })

    await auditLog(event, 'agent.update', { type: 'agent', id }, before ?? null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
