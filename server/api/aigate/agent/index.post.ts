import {
  normalizeAgentBindingInput,
  validateAgentBindings,
  writeAgentBindings,
} from '#server/utils/agent-bindings'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { agent, insertAgentSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, userId?: string, organizationId?: string | null } | undefined
    const rawBody = await readBody(event)

    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })
    if (!principal?.isAdmin && rawBody?.organizationId && rawBody.organizationId !== principal.organizationId)
      return responseError(null, 'Cannot create agent in another organization', { statusCode: 403 })
    if (!principal?.isAdmin && rawBody?.ownerId && rawBody.ownerId !== principal?.userId)
      return responseError(null, 'Cannot assign agent to another owner', { statusCode: 403 })

    const bindings = await validateAgentBindings(normalizeAgentBindingInput(rawBody || {}), principal)
    const body = insertAgentSchema.parse({
      ...rawBody,
      ...(principal?.organizationId && !rawBody?.organizationId ? { organizationId: principal.organizationId } : {}),
      ...(principal?.userId && !rawBody?.ownerId ? { ownerId: principal.userId } : {}),
      knowledgeBases: bindings.knowledgeBaseIds,
      tools: bindings.toolIds,
    })

    const res = await db.transaction(async (tx) => {
      const [created] = await tx.insert(agent).values(body).returning()
      if (!created)
        throw createError({ statusCode: 500, statusMessage: 'Agent creation failed' })
      await writeAgentBindings(tx, created.id, bindings)
      return created
    })

    await auditLog(event, 'agent.create', { type: 'agent', id: res.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
