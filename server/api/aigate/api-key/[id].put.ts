import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

const optionalDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined)
    return null
  return new Date(String(value))
}, z.date().nullable())

const updateApiKeyBodySchema = z.object({
  name: z.string().min(1).optional(),
  env: z.string().min(1).optional(),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).optional(),
  roleIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'revoked', 'expired', 'disabled']).optional(),
  expiresAt: optionalDate.optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
  ipWhitelist: z.array(z.string().min(1)).optional(),
  action: z.enum(['renew', 'disable', 'activate', 'revoke']).optional(),
  extendDays: z.number().int().positive().max(3650).optional(),
}).strict()

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = updateApiKeyBodySchema.parse(await readBody(event))
    const where = principal.organizationId
      ? and(eq(apiKey.id, id!), eq(apiKey.organizationId, principal.organizationId))
      : eq(apiKey.id, id!)
    const [before] = await db.select().from(apiKey).where(where)
    if (!before) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }

    const { action, extendDays, ...updates } = body
    if (action === 'renew') {
      const base = before.expiresAt && new Date(before.expiresAt).getTime() > Date.now()
        ? new Date(before.expiresAt)
        : new Date()
      base.setDate(base.getDate() + (extendDays || 30))
      updates.expiresAt = base
    }
    if (action === 'disable') {
      updates.status = 'disabled'
    }
    if (action === 'activate') {
      updates.status = 'active'
    }
    if (action === 'revoke') {
      updates.status = 'revoked'
    }

    const [res] = await db.update(apiKey).set(updates).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    await auditLog(event, action ? `api_key.${action}` : 'api_key.update', { type: 'api_key', id }, before, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
