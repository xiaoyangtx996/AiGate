import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { createCacheKey, getCached, setCached } from '#server/utils/cache'
import { db } from '@/db/drizzle'
import { apiKey, apiLog, channel } from '@/db/schema'

const CACHE_TTL_MS = 60 * 1000

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const orgId = principal?.organizationId
    const cacheKey = createCacheKey('gateway', orgId)
    const cached = getCached<ReturnType<typeof responseSuccess>>(cacheKey)
    if (cached)
      return cached

    const orgFilter = orgId ? eq(apiKey.organizationId, orgId) : undefined
    const logOrgFilter = orgId ? eq(apiLog.organizationId, orgId) : undefined

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

    const result = responseSuccess({
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

    setCached(cacheKey, result, CACHE_TTL_MS)
    return result
  }
  catch (err) { return responseError(err) }
})
