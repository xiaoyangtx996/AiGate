import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey, apiLog, channel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const orgFilter = principal?.organizationId ? eq(apiKey.organizationId, principal.organizationId) : undefined
    const logOrgFilter = principal?.organizationId ? eq(apiLog.organizationId, principal.organizationId) : undefined

    const keys = orgFilter
      ? await db.select().from(apiKey).where(orgFilter)
      : await db.select().from(apiKey)
    const channels = await db.select().from(channel)
    const oneHourAgo = new Date(Date.now() - 3600000)

    const recentRequests = logOrgFilter
      ? await db.select({ count: sql<number>`count(*)::int` }).from(apiLog).where(and(logOrgFilter, gte(apiLog.createdAt, oneHourAgo)))
      : await db.select({ count: sql<number>`count(*)::int` }).from(apiLog).where(gte(apiLog.createdAt, oneHourAgo))

    const recentLogs = logOrgFilter
      ? await db.select().from(apiLog).where(logOrgFilter).orderBy(desc(apiLog.createdAt)).limit(20)
      : await db.select().from(apiLog).orderBy(desc(apiLog.createdAt)).limit(20)

    const errorCount = recentLogs.filter(l => l.status === 'error').length
    const avgLatency = recentLogs.length
      ? Math.round(recentLogs.reduce((s, l) => s + (l.latency || 0), 0) / recentLogs.length)
      : 0

    return responseSuccess({
      overview: {
        activeKeys: keys.filter(k => k.status === 'active').length,
        totalKeys: keys.length,
        activeChannels: channels.filter(c => c.status === 'enabled').length,
        healthyChannels: channels.filter(c => c.health === 'healthy').length,
        requestsLastHour: recentRequests[0]?.count || 0,
        errorRate: recentLogs.length ? Math.round((errorCount / recentLogs.length) * 100) : 0,
        avgLatency,
      },
      channels: channels.map(c => ({
        id: c.id,
        name: c.name,
        vendor: c.vendor,
        status: c.status,
        health: c.health,
        priority: c.priority,
      })),
      recentLogs: recentLogs.map(l => ({
        id: l.id,
        model: l.model,
        status: l.status,
        latency: l.latency,
        totalTokens: l.totalTokens,
        createdAt: l.createdAt,
      })),
    })
  }
  catch (err) { return responseError(err) }
})
