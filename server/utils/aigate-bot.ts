import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db/drizzle'
import { agent, alert, apiKey, apiLog, channel, channelCredential, conversation, organization } from '@/db/schema'

export const AIGATE_BOT_ID = 'aigate-bot'
const keyQuestionPattern = /key|密钥|過期|过期/i
const channelQuestionPattern = /channel|渠道|health|健康/i
const alertQuestionPattern = /alert|告警|warning/i
const quotaQuestionPattern = /quota|配额/i
const agentQuestionPattern = /agent/i

export interface BotPrincipal {
  isAdmin?: boolean
  userId?: string
  organizationId?: string | null
}

export const BOT_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'query_token_usage',
      description: 'Aggregate token usage by organization, user and model for a bounded time window.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'integer', minimum: 1, maximum: 90, default: 30 },
          limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_api_keys',
      description: 'List API key status, revoked keys and keys expiring soon.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_channels_health',
      description: 'Read channel and credential health. This tool is admin-only.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_alerts',
      description: 'Read unread alerts grouped by type and severity.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_quota',
      description: 'Read tenant quota usage and estimated days before quota is exhausted.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_agents_stats',
      description: 'Read Agent conversation and error statistics.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

export function buildBotSystemPrompt(principal: BotPrincipal) {
  return [
    'You are AiGate Bot, the built-in read-only operations assistant for AiGate.',
    'You can only answer operational statistics by calling the provided tools. Do not invent numbers.',
    `Current user role: ${principal.isAdmin ? 'admin' : 'tenant user'}.`,
    `Active organization: ${principal.organizationId || 'none'}.`,
    'All tool results are already filtered by the current principal.',
    'If any tool result has restricted=true, clearly say: "Restricted by permissions: some data is not visible."',
    'Keep answers concise and prefer markdown tables for rows.',
  ].join('\n')
}

export function parseBotToolArguments(value: unknown) {
  if (!value)
    return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    }
    catch {
      return {}
    }
  }
  if (typeof value === 'object')
    return value as Record<string, unknown>
  return {}
}

const windowSchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  limit: z.coerce.number().int().min(1).max(20).default(5),
})

function orgFilter(principal: BotPrincipal) {
  return !principal.isAdmin && principal.organizationId ? eq(apiLog.organizationId, principal.organizationId) : undefined
}

function missingTenantScope(principal: BotPrincipal) {
  return !principal.isAdmin && !principal.organizationId
}

function emptyApiKeyResult(globalCount = 0) {
  return {
    restricted: true,
    visibleCount: 0,
    globalCount,
    total: 0,
    active: 0,
    disabled: 0,
    revoked: 0,
    abnormal: 0,
    expiringSoon: 0,
    rows: [],
  }
}

function emptyAlertResult(globalCount = 0) {
  return {
    restricted: true,
    visibleCount: 0,
    globalCount,
    open: 0,
    unread: 0,
    byType: {},
    byStatus: {},
    rows: [],
  }
}

function emptyAgentStatsResult(globalCount = 0) {
  return {
    restricted: true,
    visibleCount: 0,
    globalCount,
    total: 0,
    active: 0,
    rows: [],
  }
}

function daysUntilQuotaExhausted(tokenLimit: number, tokenUsed: number, avgDailyTokens: number) {
  if (tokenLimit <= 0 || avgDailyTokens <= 0)
    return null
  return Math.max(0, Math.ceil((tokenLimit - tokenUsed) / avgDailyTokens))
}

export async function queryTokenUsage(principal: BotPrincipal, input: unknown = {}) {
  const args = windowSchema.parse(input)
  if (missingTenantScope(principal)) {
    const since = new Date(Date.now() - args.days * 86400000)
    const [globalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiLog)
      .where(gte(apiLog.createdAt, since))
    return { restricted: true, visibleCount: 0, globalCount: globalRow?.count ?? 0, rows: [] }
  }
  const since = new Date(Date.now() - args.days * 86400000)
  const scope = orgFilter(principal)
  const where = scope ? and(scope, gte(apiLog.createdAt, since)) : gte(apiLog.createdAt, since)
  const rows = await db
    .select({
      organizationId: sql<string>`COALESCE(${apiLog.organizationId}, 'unknown')`.as('organization_id'),
      userId: sql<string>`COALESCE(${apiLog.userId}, 'unknown')`.as('user_id'),
      model: sql<string>`COALESCE(${apiLog.model}, 'unknown')`.as('model'),
      tokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))::int`.as('tokens'),
      requests: sql<number>`COUNT(*)::int`.as('requests'),
      cost: sql<number>`SUM(COALESCE(${apiLog.cost}, 0))`.as('cost'),
    })
    .from(apiLog)
    .where(where)
    .groupBy(
      sql`COALESCE(${apiLog.organizationId}, 'unknown')`,
      sql`COALESCE(${apiLog.userId}, 'unknown')`,
      sql`COALESCE(${apiLog.model}, 'unknown')`,
    )
    .orderBy(sql`SUM(COALESCE(${apiLog.totalTokens}, 0)) DESC`)
    .limit(args.limit)
  return {
    restricted: !principal.isAdmin,
    visibleCount: rows.length,
    globalCount: rows.length,
    rows,
  }
}

export async function queryApiKeys(principal: BotPrincipal) {
  if (missingTenantScope(principal)) {
    const [globalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(apiKey)
    return emptyApiKeyResult(globalRow?.count ?? 0)
  }
  const where = !principal.isAdmin && principal.organizationId ? eq(apiKey.organizationId, principal.organizationId) : undefined
  const rows = await db.select().from(apiKey).where(where).limit(20)
  const [globalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(apiKey).where(where)
  const now = Date.now()
  return {
    restricted: !principal.isAdmin,
    visibleCount: rows.length,
    globalCount: globalRow?.count ?? rows.length,
    total: rows.length,
    active: rows.filter(row => row.status === 'active').length,
    disabled: rows.filter(row => row.status === 'disabled').length,
    revoked: rows.filter(row => row.status === 'revoked').length,
    abnormal: rows.filter(row => ['disabled', 'revoked', 'expired'].includes(row.status)).length,
    expiringSoon: rows.filter(row => row.expiresAt && new Date(row.expiresAt).getTime() - now < 7 * 86400000).length,
    rows: rows.map(row => ({ id: row.id, name: row.name, status: row.status, expiresAt: row.expiresAt })),
  }
}

export async function queryChannelsHealth(principal: BotPrincipal) {
  if (!principal.isAdmin)
    return { restricted: true, error: 'admin_only' }
  const rows = await db.select({ id: channel.id, name: channel.name, status: channel.status, health: channel.health }).from(channel)
  const credentials = rows.length
    ? await db
        .select({
          channelId: channelCredential.channelId,
          status: channelCredential.status,
        })
        .from(channelCredential)
        .where(inArray(channelCredential.channelId, rows.map(row => row.id)))
    : []
  const credentialStats = new Map<string, { total: number, active: number, exhausted: number, error: number }>()
  for (const credential of credentials) {
    const stats = credentialStats.get(credential.channelId) || { total: 0, active: 0, exhausted: 0, error: 0 }
    stats.total += 1
    if (credential.status === 'active')
      stats.active += 1
    if (credential.status === 'exhausted')
      stats.exhausted += 1
    if (credential.status === 'error')
      stats.error += 1
    credentialStats.set(credential.channelId, stats)
  }
  return {
    restricted: false,
    total: rows.length,
    healthy: rows.filter(row => row.health === 'healthy').length,
    rows: rows.map(row => ({
      ...row,
      credentials: credentialStats.get(row.id) || { total: 0, active: 0, exhausted: 0, error: 0 },
    })),
  }
}

export async function queryAlerts(principal: BotPrincipal) {
  if (missingTenantScope(principal)) {
    const [globalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(alert).where(eq(alert.status, 'open'))
    return emptyAlertResult(globalRow?.count ?? 0)
  }
  const where = !principal.isAdmin && principal.organizationId
    ? and(eq(alert.organizationId, principal.organizationId), eq(alert.status, 'open'))
    : eq(alert.status, 'open')
  const rows = await db.select().from(alert).where(where).limit(20)
  const [globalRow] = await db.select({ count: sql<number>`count(*)::int` }).from(alert).where(where)
  return {
    restricted: !principal.isAdmin,
    visibleCount: rows.length,
    globalCount: globalRow?.count ?? rows.length,
    open: rows.filter(row => (row.status || (row.read ? 'acknowledged' : 'open')) === 'open').length,
    unread: rows.filter(row => !row.read).length,
    byType: rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = (acc[row.type] || 0) + 1
      return acc
    }, {}),
    byStatus: rows.reduce<Record<string, number>>((acc, row) => {
      const status = row.status || (row.read ? 'acknowledged' : 'open')
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}),
    rows: rows.map(row => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      title: row.title,
      read: row.read,
      status: row.status || (row.read ? 'acknowledged' : 'open'),
    })),
  }
}

export async function queryQuota(principal: BotPrincipal) {
  if (missingTenantScope(principal))
    return { restricted: true, rows: [] }
  const where = !principal.isAdmin && principal.organizationId ? eq(organization.id, principal.organizationId) : undefined
  const rows = await db.select().from(organization).where(where).limit(20)
  const since = new Date(Date.now() - 7 * 86400000)
  const usageWhere = !principal.isAdmin && principal.organizationId
    ? and(eq(apiLog.organizationId, principal.organizationId), gte(apiLog.createdAt, since))
    : gte(apiLog.createdAt, since)
  const usageRows = await db
    .select({
      organizationId: sql<string>`COALESCE(${apiLog.organizationId}, 'unknown')`.as('organization_id'),
      tokens: sql<number>`SUM(COALESCE(${apiLog.totalTokens}, 0))::int`.as('tokens'),
    })
    .from(apiLog)
    .where(usageWhere)
    .groupBy(sql`COALESCE(${apiLog.organizationId}, 'unknown')`)
  const avgDailyByOrg = new Map(usageRows.map(row => [row.organizationId, (Number(row.tokens) || 0) / 7]))
  return {
    restricted: !principal.isAdmin,
    rows: rows.map(row => ({
      id: row.id,
      name: row.name,
      tokenLimit: row.tokenLimit,
      tokenUsed: row.tokenUsed,
      usedPercentage: row.tokenLimit > 0 ? Math.round((row.tokenUsed / row.tokenLimit) * 100) : 0,
      estimatedDaysRemaining: daysUntilQuotaExhausted(row.tokenLimit, row.tokenUsed, avgDailyByOrg.get(row.id) || 0),
    })),
  }
}

export async function queryAgentsStats(principal: BotPrincipal) {
  if (missingTenantScope(principal))
    return emptyAgentStatsResult()
  const where = !principal.isAdmin && principal.organizationId ? eq(agent.organizationId, principal.organizationId) : undefined
  const rows = await db.select().from(agent).where(where).limit(20)
  const agentIds = rows.map(row => row.id)
  const statScope = agentIds.length > 0 ? inArray(conversation.agentId, agentIds) : undefined
  const errorScope = agentIds.length > 0 ? inArray(apiLog.agentId, agentIds) : undefined
  const conversationRows = rows.length
    ? await db
        .select({
          agentId: conversation.agentId,
          conversations: sql<number>`COUNT(*)::int`.as('conversations'),
        })
        .from(conversation)
        .where(statScope)
        .groupBy(conversation.agentId)
    : []
  const errorRows = rows.length
    ? await db
        .select({
          agentId: apiLog.agentId,
          errors: sql<number>`COUNT(*)::int`.as('errors'),
        })
        .from(apiLog)
        .where(and(eq(apiLog.type, 'agent_chat'), eq(apiLog.status, 'error'), errorScope))
        .groupBy(apiLog.agentId)
    : []
  const conversationsByAgent = new Map(conversationRows.map(row => [row.agentId, Number(row.conversations) || 0]))
  const errorsByAgent = new Map(errorRows.map(row => [row.agentId, Number(row.errors) || 0]))
  return {
    restricted: !principal.isAdmin,
    total: rows.length,
    active: rows.filter(row => row.status === 'active' && row.enabled).length,
    rows: rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      enabled: row.enabled,
      conversations: conversationsByAgent.get(row.id) || 0,
      errors: errorsByAgent.get(row.id) || 0,
    })),
  }
}

export async function runBotTool(name: string, principal: BotPrincipal, input?: unknown) {
  if (name === 'query_api_keys')
    return queryApiKeys(principal)
  if (name === 'query_channels_health')
    return queryChannelsHealth(principal)
  if (name === 'query_alerts')
    return queryAlerts(principal)
  if (name === 'query_quota')
    return queryQuota(principal)
  if (name === 'query_agents_stats')
    return queryAgentsStats(principal)
  return queryTokenUsage(principal, input)
}

export function pickBotTool(message: string) {
  if (keyQuestionPattern.test(message))
    return 'query_api_keys'
  if (channelQuestionPattern.test(message))
    return 'query_channels_health'
  if (alertQuestionPattern.test(message))
    return 'query_alerts'
  if (quotaQuestionPattern.test(message))
    return 'query_quota'
  if (agentQuestionPattern.test(message))
    return 'query_agents_stats'
  return 'query_token_usage'
}
