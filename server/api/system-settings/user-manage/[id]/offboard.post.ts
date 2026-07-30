import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { agent, apiKey, knowledgeBase, member, user } from '@/db/schema'

const offboardBodySchema = z.object({
  confirmText: z.string(),
  reason: z.string().optional(),
  banUser: z.boolean().optional(),
  revokeApiKeys: z.boolean().optional(),
  removeMembers: z.boolean().optional(),
  transferAgents: z.boolean().optional(),
  transferKnowledgeBases: z.boolean().optional(),
  transferToUserId: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, userId?: string } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const body = offboardBodySchema.parse(await readBody(event))
    const confirmText = body.confirmText
    const [target] = await db.select().from(user).where(eq(user.id, id!))
    if (!target)
      return responseError(null, 'User not found', { statusCode: 404 })
    if (confirmText !== (target.username || target.email))
      return responseError(null, 'Confirm text mismatch', { statusCode: 400 })
    if ((body.transferAgents || body.transferKnowledgeBases) && !body.transferToUserId)
      return responseError(null, 'Transfer target is required', { statusCode: 400 })
    if (body.transferToUserId === id)
      return responseError(null, 'Transfer target cannot be the offboarded user', { statusCode: 400 })
    if (body.transferAgents || body.transferKnowledgeBases) {
      const [transferTarget] = await db.select().from(user).where(eq(user.id, body.transferToUserId!))
      if (!transferTarget)
        return responseError(null, 'Transfer target not found', { statusCode: 404 })
    }

    const steps: Array<{ key: string, ok: boolean, count?: number }> = []
    const before = { user: target }

    if (body?.banUser !== false) {
      await db
        .update(user)
        .set({ banned: true, banReason: body?.reason || 'offboarded', banExpires: null })
        .where(eq(user.id, id!))
      steps.push({ key: 'banUser', ok: true, count: 1 })
    }

    if (body?.revokeApiKeys !== false) {
      const revoked = await db.update(apiKey).set({ status: 'revoked' }).where(eq(apiKey.userId, id!)).returning()
      steps.push({ key: 'revokeApiKeys', ok: true, count: revoked.length })
    }

    if (body?.removeMembers !== false) {
      const removed = await db.delete(member).where(eq(member.userId, id!)).returning()
      steps.push({ key: 'removeMembers', ok: true, count: removed.length })
    }

    if (body.transferAgents) {
      const transferred = await db.update(agent).set({ ownerId: body.transferToUserId }).where(eq(agent.ownerId, id!)).returning()
      steps.push({ key: 'transferAgents', ok: true, count: transferred.length })
    }

    if (body.transferKnowledgeBases) {
      const transferred = await db.update(knowledgeBase).set({ ownerId: body.transferToUserId }).where(eq(knowledgeBase.ownerId, id!)).returning()
      steps.push({ key: 'transferKnowledgeBases', ok: true, count: transferred.length })
    }

    const [after] = await db.select().from(user).where(eq(user.id, id!))
    await auditLog(event, 'user.offboard', { type: 'user', id }, before, { user: after, steps })
    return responseSuccess({ steps })
  }
  catch (err) {
    return responseError(err)
  }
})
