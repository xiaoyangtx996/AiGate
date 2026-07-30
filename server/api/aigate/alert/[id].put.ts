import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

const allowedStatuses = ['open', 'acknowledged', 'resolved'] as const
type AlertStatus = typeof allowedStatuses[number]

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const body = await readBody(event).catch(() => ({})) as { status?: unknown }
    const nextStatus = allowedStatuses.includes(body.status as AlertStatus)
      ? body.status as AlertStatus
      : 'acknowledged'
    const where = principal?.organizationId
      ? and(eq(alert.id, id!), eq(alert.organizationId, principal.organizationId))
      : eq(alert.id, id!)
    const [res] = await db.update(alert).set({ read: nextStatus !== 'open', status: nextStatus }).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    return responseSuccess(res)
  } catch (err) {
    return responseError(err)
  }
})
