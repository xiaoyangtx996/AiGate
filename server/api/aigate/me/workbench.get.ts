import { and, desc, eq, gte, or, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent, alert, apiKey, apiLog, organization } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { userId?: string; organizationId?: string | null } | undefined
    if (!principal?.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const rangeStart = new Date(Date.now() - 7 * 86400000)
    const orgFilter = principal.organizationId ? eq(agent.organizationId, principal.organizationId) : undefined
    const alertScope = principal.organizationId
      ? or(eq(alert.userId, principal.userId), eq(alert.organizationId, principal.organizationId))
      : eq(alert.userId, principal.userId)

    const [orgRows, keyRows, usageRows, agentRows, alertRows, usageSummaryRows] = await Promise.all([
      principal.organizationId
        ? db
            .select({
              id: organization.id,
              name: organization.name,
              tokenLimit: organization.tokenLimit,
              tokenUsed: organization.tokenUsed,
            })
            .from(organization)
            .where(eq(organization.id, principal.organizationId))
        : Promise.resolve([]),

      db
        .select({
          id: apiKey.id,
          name: apiKey.name,
          status: apiKey.status,
          env: apiKey.env,
          expiresAt: apiKey.expiresAt,
          lastUsed: apiKey.lastUsed,
          calls: apiKey.calls,
        })
        .from(apiKey)
        .where(eq(apiKey.userId, principal.userId))
        .orderBy(desc(apiKey.createdAt))
        .limit(5),

      db
        .select({
          date: sql<string>`DATE(${apiLog.createdAt})`.as('date'),
          tokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))::int`.as('tokens'),
          requests: sql<number>`COUNT(*)::int`.as('requests'),
        })
        .from(apiLog)
        .where(and(eq(apiLog.userId, principal.userId), gte(apiLog.createdAt, rangeStart)))
        .groupBy(sql`DATE(${apiLog.createdAt})`)
        .orderBy(sql`DATE(${apiLog.createdAt})`),

      db
        .select({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          model: agent.model,
          status: agent.status,
          builtin: agent.builtin,
        })
        .from(agent)
        .where(
          orgFilter ? and(eq(agent.enabled, true), or(eq(agent.builtin, true), orgFilter)) : eq(agent.enabled, true),
        )
        .orderBy(desc(agent.builtin), desc(agent.updatedAt))
        .limit(6),

      db
        .select({
          id: alert.id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          severity: alert.severity,
          read: alert.read,
          createdAt: alert.createdAt,
        })
        .from(alert)
        .where(alertScope)
        .orderBy(desc(alert.createdAt))
        .limit(5),

      db
        .select({
          totalTokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))::int`.as('total_tokens'),
          totalRequests: sql<number>`COUNT(*)::int`.as('total_requests'),
          totalCost: sql<number>`SUM(COALESCE(${apiLog.cost}, 0))`.as('total_cost'),
        })
        .from(apiLog)
        .where(eq(apiLog.userId, principal.userId)),
    ])

    const org = orgRows[0] ?? null
    const summary = usageSummaryRows[0] ?? { totalTokens: 0, totalRequests: 0, totalCost: 0 }
    const usagePercent = org && org.tokenLimit > 0 ? Math.round((org.tokenUsed / org.tokenLimit) * 100) : 0

    return responseSuccess({
      profile: {
        userId: principal.userId,
        organizationId: principal.organizationId ?? null,
        organizationName: org?.name ?? null,
      },
      quota: org
        ? {
            tokenLimit: org.tokenLimit,
            tokenUsed: org.tokenUsed,
            remaining: Math.max(0, org.tokenLimit - org.tokenUsed),
            usagePercent,
          }
        : null,
      usage: {
        totalTokens: summary.totalTokens || 0,
        totalRequests: summary.totalRequests || 0,
        totalCost: summary.totalCost || 0,
        daily: usageRows,
      },
      apiKeys: keyRows,
      agents: agentRows,
      alerts: alertRows,
    })
  } catch (err) {
    return responseError(err)
  }
})
