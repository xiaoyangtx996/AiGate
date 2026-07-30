import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

const alertCategoryTypes = {
  quota: ['quota_warning', 'tenant_expiring', 'key_expiring', 'key_expired', 'cost_spike'],
  access: ['channel_down', 'credential_exhausted', 'mcp_unavailable'],
  ai: ['knowledge_storage', 'agent_error', 'error_spike', 'rate_limit'],
  system: ['system'],
} as const satisfies Record<string, readonly ('quota_warning' | 'tenant_expiring' | 'key_expiring' | 'key_expired' | 'cost_spike' | 'channel_down' | 'credential_exhausted' | 'mcp_unavailable' | 'knowledge_storage' | 'agent_error' | 'error_spike' | 'rate_limit' | 'system')[]>

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId)
      conditions.push(eq(alert.organizationId, principal.organizationId))
    if (query.keyword) {
      conditions.push(or(ilike(alert.title, `%${query.keyword}%`), ilike(alert.message, `%${query.keyword}%`)))
    }
    const status = typeof query.status === 'string' ? query.status : ''
    const normalizedStatus = status === 'unread' ? 'open' : status === 'read' ? 'acknowledged' : status
    if (normalizedStatus === 'open' || normalizedStatus === 'acknowledged' || normalizedStatus === 'resolved')
      conditions.push(eq(alert.status, normalizedStatus))
    const category = typeof query.category === 'string' ? query.category : ''
    if (category && category !== 'all') {
      const types = alertCategoryTypes[category as keyof typeof alertCategoryTypes] || []
      if (types.length > 0)
        conditions.push(or(...types.map((type: string) => eq(alert.type, type as never))))
    }
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(alert)
      .where(where)
    const data = await db
      .select()
      .from(alert)
      .where(where)
      .orderBy(desc(alert.createdAt))
      .limit(pageSize)
      .offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) {
    return responseError(err)
  }
})
