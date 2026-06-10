import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey, apiLog, channel, organization } from '@/db/schema'

const CACHE_TTL_MS = 5 * 60 * 1000
const dashboardCache = new Map<string, { data: unknown, expiresAt: number }>()

function parseRangeDays(range?: string): number {
  if (range === '30d')
    return 30
  if (range === '90d')
    return 90
  return 7
}

function getCacheKey(orgId: string | null | undefined, rangeDays: number): string {
  return `dashboard:${orgId ?? 'all'}:${rangeDays}d`
}

function getCached<T>(key: string): T | null {
  const entry = dashboardCache.get(key)
  if (!entry)
    return null
  if (Date.now() > entry.expiresAt) {
    dashboardCache.delete(key)
    return null
  }
  return entry.data as T
}

function setCached(key: string, data: unknown): void {
  dashboardCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const rangeDays = parseRangeDays(query.range as string | undefined)
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const orgId = principal?.organizationId

    const cacheKey = getCacheKey(orgId, rangeDays)
    const cached = getCached<IResponse>(cacheKey)
    if (cached)
      return cached

    const orgFilter = orgId ? eq(apiKey.organizationId, orgId) : undefined
    const logOrgFilter = orgId ? eq(apiLog.organizationId, orgId) : undefined
    const rangeStart = new Date(Date.now() - rangeDays * 86400000)
    const rangeConditions = logOrgFilter
      ? and(logOrgFilter, gte(apiLog.createdAt, rangeStart))
      : gte(apiLog.createdAt, rangeStart)

    const [
      orgs,
      keys,
      channels,
      logs,
      dailyUsageRows,
      modelUsageRows,
      statusRows,
    ] = await Promise.all([
      db.select({
        id: organization.id,
        name: organization.name,
        tokenLimit: organization.tokenLimit,
        tokenUsed: organization.tokenUsed,
      }).from(organization),

      orgFilter
        ? db.select({ status: apiKey.status, expiresAt: apiKey.expiresAt }).from(apiKey).where(orgFilter)
        : db.select({ status: apiKey.status, expiresAt: apiKey.expiresAt }).from(apiKey),

      db.select({ status: channel.status, health: channel.health }).from(channel),

      logOrgFilter
        ? db.select({ totalTokens: apiLog.totalTokens }).from(apiLog).where(logOrgFilter).orderBy(desc(apiLog.createdAt)).limit(100)
        : db.select({ totalTokens: apiLog.totalTokens }).from(apiLog).orderBy(desc(apiLog.createdAt)).limit(100),

      db.select({
        date: sql<string>`DATE(${apiLog.createdAt})`.as('date'),
        tokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))::int`.as('tokens'),
        requests: sql<number>`COUNT(*)::int`.as('requests'),
        cost: sql<number>`SUM(COALESCE(${apiLog.cost}, 0))::int`.as('cost'),
      })
        .from(apiLog)
        .where(rangeConditions)
        .groupBy(sql`DATE(${apiLog.createdAt})`)
        .orderBy(sql`DATE(${apiLog.createdAt})`),

      db.select({
        model: sql<string>`COALESCE(${apiLog.model}, 'unknown')`.as('model'),
        tokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))::int`.as('tokens'),
        requests: sql<number>`COUNT(*)::int`.as('requests'),
        cost: sql<number>`SUM(COALESCE(${apiLog.cost}, 0))::int`.as('cost'),
      })
        .from(apiLog)
        .where(rangeConditions)
        .groupBy(sql`COALESCE(${apiLog.model}, 'unknown')`)
        .orderBy(sql`SUM(COALESCE(${apiLog.totalTokens}, 0)) DESC`)
        .limit(10),

      db.select({
        status: sql<string>`COALESCE(${apiLog.status}, 'unknown')`.as('status'),
        count: sql<number>`COUNT(*)::int`.as('count'),
      })
        .from(apiLog)
        .where(rangeConditions)
        .groupBy(sql`COALESCE(${apiLog.status}, 'unknown')`),
    ])

    const totalTokens = logs.reduce((s, l) => s + (l.totalTokens || 0), 0)
    const activeKeys = keys.filter(k => k.status === 'active').length
    const expiringSoon = keys.filter(k => k.expiresAt && new Date(k.expiresAt).getTime() - Date.now() < 7 * 86400000).length

    const statusCounts: Record<string, number> = {}
    for (const row of statusRows) {
      statusCounts[row.status] = row.count
    }

    const activeChannels = channels.filter(c => c.status === 'enabled').length
    const healthyChannels = channels.filter(c => c.health === 'healthy').length

    const result = responseSuccess({
      range: `${rangeDays}d`,
      overview: {
        totalTokens,
        activeKeys,
        expiringSoon,
        totalChannels: channels.length,
        activeChannels,
        healthyChannels,
        totalOrganizations: orgs.length,
      },
      trend: {
        daily: dailyUsageRows.map(row => ({
          date: String(row.date),
          tokens: row.tokens,
          requests: row.requests,
          cost: row.cost,
        })),
      },
      modelBreakdown: modelUsageRows.map(row => ({
        model: row.model,
        tokens: row.tokens,
        requests: row.requests,
        cost: row.cost,
      })),
      statusDistribution: statusCounts,
      quotaStatus: orgs.filter(o => o.tokenLimit > 0).map(o => ({
        organizationId: o.id,
        organizationName: o.name,
        usedPercentage: Math.round((o.tokenUsed / o.tokenLimit) * 100),
        isWarning: (o.tokenUsed / o.tokenLimit) > 0.9,
      })),
    })

    setCached(cacheKey, result)
    return result
  }
  catch (err) { return responseError(err) }
})
