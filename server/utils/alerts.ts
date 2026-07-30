import { and, eq, gte, lt, or } from 'drizzle-orm'
import { notifyAlertSubscribers } from '#server/utils/alert-notify'
import { db } from '@/db/drizzle'
import { agent, alert, alertRule, apiKey, apiLog, channel, channelCredential, knowledgeBase, mcpTool, organization, storageInstance } from '@/db/schema'

type AlertType
  = | 'quota_warning'
    | 'tenant_expiring'
    | 'key_expiring'
    | 'key_expired'
    | 'error_spike'
    | 'rate_limit'
    | 'mcp_unavailable'
    | 'knowledge_storage'
    | 'agent_error'
    | 'channel_down'
    | 'credential_exhausted'
    | 'cost_spike'

type AlertSeverity = 'info' | 'warning' | 'critical'

function activeAlertStatusCondition() {
  return or(eq(alert.status, 'open'), eq(alert.status, 'acknowledged'))
}

async function createUnreadAlertOnce(input: {
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  resourceId: string
  organizationId?: string | null
  userId?: string | null
  notifyChannels?: string[]
}) {
  const existing = await db
    .select()
    .from(alert)
    .where(and(eq(alert.type, input.type), eq(alert.resourceId, input.resourceId), activeAlertStatusCondition()))
  if (existing.length > 0)
    return null

  const [newAlert] = await db
    .insert(alert)
    .values({
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      resourceId: input.resourceId,
    })
    .returning()
  if (newAlert)
    await notifyAlertSubscribers(newAlert.id, input.notifyChannels || ['email']).catch(() => {})
  return newAlert
}

export function getQuotaAlertTier(usagePercent: number) {
  if (usagePercent >= 100)
    return 100
  if (usagePercent >= 90)
    return 90
  if (usagePercent >= 70)
    return 70
  return 0
}

export function getQuotaAlertSeverityByTier(tier: number) {
  return tier >= 100 ? 'critical' : 'warning'
}

export function getQuotaAlertResourceId(organizationId: string, tier: number) {
  return `quota:${organizationId}:${tier}`
}

export function formatQuotaAlertMessage(
  org: { name: string, tokenLimit: number, tokenUsed: number },
  usagePercent: number,
  tier: number,
) {
  return `组织 "${org.name}" 配额使用已达 ${usagePercent}%（${org.tokenUsed}/${org.tokenLimit} tokens），触发 ${tier}% 阈值`
}

export async function generateQuotaAlerts() {
  const orgs = await db.select().from(organization).where(eq(organization.enabled, true))
  for (const org of orgs) {
    if (org.tokenLimit <= 0)
      continue
    const usagePercent = Math.round((org.tokenUsed / org.tokenLimit) * 100)
    const tier = getQuotaAlertTier(usagePercent)
    if (tier > 0) {
      const existing = await db
        .select()
        .from(alert)
        .where(
          and(
            eq(alert.type, 'quota_warning'),
            eq(alert.organizationId, org.id),
            eq(alert.resourceId, getQuotaAlertResourceId(org.id, tier)),
            activeAlertStatusCondition(),
          ),
        )
      if (existing.length === 0) {
        const [newAlert] = await db
          .insert(alert)
          .values({
            type: 'quota_warning',
            severity: getQuotaAlertSeverityByTier(tier),
            title: `配额预警：${org.name} ${tier}%`,
            message: formatQuotaAlertMessage(org, usagePercent, tier),
            organizationId: org.id,
            resourceId: getQuotaAlertResourceId(org.id, tier),
          })
          .returning()
        if (newAlert)
          await notifyAlertSubscribers(newAlert.id, ['email']).catch(() => {})
      }
    }
  }
}

export async function generateKeyExpiryAlerts() {
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000)
  const expiringKeys = await db
    .select()
    .from(apiKey)
    .where(and(eq(apiKey.status, 'active'), lt(apiKey.expiresAt, sevenDaysLater), gte(apiKey.expiresAt, new Date())))
  for (const key of expiringKeys) {
    const existing = await db
      .select()
      .from(alert)
      .where(and(eq(alert.type, 'key_expiring'), eq(alert.resourceId, key.id), activeAlertStatusCondition()))
    if (existing.length === 0) {
      const [newAlert] = await db
        .insert(alert)
        .values({
          type: 'key_expiring',
          severity: 'warning',
          title: `密钥即将过期：${key.name}`,
          message: `密钥 "${key.name}" 将于 ${key.expiresAt?.toISOString().split('T')[0]} 过期`,
          organizationId: key.organizationId,
          userId: key.userId,
          resourceId: key.id,
        })
        .returning()
      if (newAlert)
        await notifyAlertSubscribers(newAlert.id, ['email']).catch(() => {})
    }
  }
}

export function getTenantExpiryAlertResourceId(organizationId: string, days: number) {
  return `tenant-expiring:${organizationId}:${days}`
}

export async function generateTenantExpiryAlerts() {
  const now = new Date()
  const maxDeadline = new Date(Date.now() + 14 * 86400000)
  const orgs = await db
    .select()
    .from(organization)
    .where(and(eq(organization.tenantStatus, 'active'), gte(organization.expireTime, now), lt(organization.expireTime, maxDeadline)))

  for (const org of orgs) {
    if (!org.expireTime)
      continue
    const daysLeft = Math.max(1, Math.ceil((org.expireTime.getTime() - Date.now()) / 86400000))
    const tier = daysLeft <= 1 ? 1 : daysLeft <= 7 ? 7 : 14
    const resourceId = getTenantExpiryAlertResourceId(org.id, tier)
    const existing = await db
      .select()
      .from(alert)
      .where(and(eq(alert.type, 'tenant_expiring'), eq(alert.organizationId, org.id), eq(alert.resourceId, resourceId), activeAlertStatusCondition()))
    if (existing.length > 0)
      continue

    const [newAlert] = await db
      .insert(alert)
      .values({
        type: 'tenant_expiring',
        severity: tier <= 1 ? 'critical' : 'warning',
        title: `Tenant expiring: ${org.name}`,
        message: `Tenant "${org.name}" will expire in ${daysLeft} day(s).`,
        organizationId: org.id,
        resourceId,
      })
      .returning()
    if (newAlert)
      await notifyAlertSubscribers(newAlert.id, ['email']).catch(() => {})
  }
}

export async function generateExpiredKeyAlerts() {
  const now = new Date()
  const expiredKeys = await db
    .select()
    .from(apiKey)
    .where(or(eq(apiKey.status, 'expired'), and(eq(apiKey.status, 'active'), lt(apiKey.expiresAt, now))))

  for (const key of expiredKeys) {
    await createUnreadAlertOnce({
      type: 'key_expired',
      severity: 'critical',
      title: `Key expired: ${key.name}`,
      message: `API key "${key.name}" is expired and should be revoked or rotated.`,
      organizationId: key.organizationId,
      userId: key.userId,
      resourceId: `key-expired:${key.id}`,
    })
  }
}

export async function generateChannelDownAlerts() {
  const rows = await db
    .select()
    .from(channel)
    .where(and(eq(channel.status, 'enabled'), or(eq(channel.health, 'down'), eq(channel.health, 'degraded'))))

  for (const row of rows) {
    await createUnreadAlertOnce({
      type: 'channel_down',
      severity: row.health === 'down' ? 'critical' : 'warning',
      title: `Channel unhealthy: ${row.name}`,
      message: `Channel "${row.name}" health is ${row.health}.`,
      resourceId: `channel-down:${row.id}:${row.health}`,
    })
  }
}

export async function generateCredentialExhaustedAlerts() {
  const rows = await db.select().from(channelCredential).where(eq(channelCredential.status, 'exhausted'))

  for (const row of rows) {
    await createUnreadAlertOnce({
      type: 'credential_exhausted',
      severity: 'critical',
      title: `Credential exhausted: ${row.name}`,
      message: `Channel credential "${row.name}" is exhausted.`,
      resourceId: `credential-exhausted:${row.id}`,
    })
  }
}

export async function generateMcpUnavailableAlerts() {
  const rows = await db
    .select()
    .from(mcpTool)
    .where(or(eq(mcpTool.connectionStatus, 'failed'), eq(mcpTool.healthStatus, 'down'), eq(mcpTool.healthStatus, 'degraded')))

  for (const row of rows) {
    await createUnreadAlertOnce({
      type: 'mcp_unavailable',
      severity: row.healthStatus === 'down' || row.connectionStatus === 'failed' ? 'critical' : 'warning',
      title: `MCP unavailable: ${row.name}`,
      message: row.lastError || `MCP tool "${row.name}" is unavailable.`,
      organizationId: row.organizationId,
      resourceId: `mcp-unavailable:${row.id}`,
    })
  }
}

export async function generateKnowledgeStorageAlerts(thresholdPercent = 80) {
  const [instances, bases] = await Promise.all([
    db.select().from(storageInstance).where(eq(storageInstance.status, 'active')),
    db.select().from(knowledgeBase).where(eq(knowledgeBase.enabled, true)),
  ])
  const capacityByStorage = new Map(
    instances
      .map((item) => {
        const config = (item.config || {}) as Record<string, unknown>
        const capacity = Number(config.capacityBytes ?? config.maxBytes ?? config.storageLimitBytes)
        return Number.isFinite(capacity) && capacity > 0 ? [item.id, capacity] as const : null
      })
      .filter(Boolean) as Array<readonly [string, number]>,
  )

  for (const kb of bases) {
    const capacity = kb.storageInstanceId ? capacityByStorage.get(kb.storageInstanceId) : undefined
    if (!capacity)
      continue
    const usedPercent = Math.round(((kb.size || 0) / capacity) * 100)
    if (usedPercent < thresholdPercent)
      continue
    await createUnreadAlertOnce({
      type: 'knowledge_storage',
      severity: usedPercent >= 100 ? 'critical' : 'warning',
      title: `Knowledge storage warning: ${kb.name}`,
      message: `Knowledge base "${kb.name}" uses ${usedPercent}% of configured storage capacity.`,
      organizationId: kb.organizationId,
      resourceId: `knowledge-storage:${kb.id}:${thresholdPercent}`,
    })
  }
}

function countBy<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const value = key(row)
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return counts
}

function ruleNotifyChannels(rule: typeof alertRule.$inferSelect) {
  return Array.isArray(rule.notifyChannels) ? rule.notifyChannels : []
}

function ruleMatchesOrganization(rule: typeof alertRule.$inferSelect, organizationId?: string | null) {
  return !rule.organizationId || rule.organizationId === organizationId
}

function ruleResourceId(rule: typeof alertRule.$inferSelect, resourceId: string) {
  return `rule:${rule.id || rule.name}:${resourceId}`
}

async function createRuleAlert(rule: typeof alertRule.$inferSelect, input: {
  type: AlertType
  severity: AlertSeverity
  title?: string
  message: string
  resourceId: string
  organizationId?: string | null
  userId?: string | null
}) {
  return createUnreadAlertOnce({
    ...input,
    title: input.title || `[Rule] ${rule.name}`,
    resourceId: ruleResourceId(rule, input.resourceId),
    notifyChannels: ruleNotifyChannels(rule),
  })
}

export async function generateErrorSpikeAlerts(threshold = 10) {
  const since = new Date(Date.now() - 5 * 60000)
  const rows = await db
    .select()
    .from(apiLog)
    .where(and(gte(apiLog.createdAt, since), or(eq(apiLog.status, 'error'), gte(apiLog.statusCode, 500))))
  const counts = countBy(rows, row => row.organizationId || 'global')
  const bucket = Math.floor(Date.now() / 300000)

  for (const [organizationId, count] of counts) {
    if (count < threshold)
      continue
    await createUnreadAlertOnce({
      type: 'error_spike',
      severity: 'critical',
      title: '5xx/error spike detected',
      message: `${count} failed API calls detected in the last 5 minutes.`,
      organizationId: organizationId === 'global' ? null : organizationId,
      resourceId: `error-spike:${organizationId}:${bucket}`,
    })
  }
}

export async function generateRateLimitAlerts(threshold = 10) {
  const since = new Date(Date.now() - 5 * 60000)
  const rows = await db
    .select()
    .from(apiLog)
    .where(and(gte(apiLog.createdAt, since), or(eq(apiLog.status, 'rate_limited'), eq(apiLog.statusCode, 429))))
  const counts = countBy(rows, row => row.organizationId || 'global')
  const bucket = Math.floor(Date.now() / 300000)

  for (const [organizationId, count] of counts) {
    if (count < threshold)
      continue
    await createUnreadAlertOnce({
      type: 'rate_limit',
      severity: 'warning',
      title: 'Rate limit spike detected',
      message: `${count} rate-limited API calls detected in the last 5 minutes.`,
      organizationId: organizationId === 'global' ? null : organizationId,
      resourceId: `rate-limit:${organizationId}:${bucket}`,
    })
  }
}

export async function generateAgentErrorAlerts(threshold = 5) {
  const since = new Date(Date.now() - 5 * 60000)
  const rows = await db
    .select()
    .from(apiLog)
    .where(and(eq(apiLog.type, 'agent_chat'), eq(apiLog.status, 'error'), gte(apiLog.createdAt, since)))
  const counts = countBy(rows, row => row.agentId || 'unknown')
  if (counts.size === 0)
    return
  const agentRows = await db.select().from(agent)
  const agentsById = new Map(agentRows.map(row => [row.id, row]))
  const bucket = Math.floor(Date.now() / 300000)

  for (const [agentId, count] of counts) {
    if (count < threshold)
      continue
    const row = agentsById.get(agentId)
    await createUnreadAlertOnce({
      type: 'agent_error',
      severity: 'warning',
      title: `Agent error spike: ${row?.name || agentId}`,
      message: `${count} agent chat errors detected in the last 5 minutes.`,
      organizationId: row?.organizationId ?? null,
      resourceId: `agent-error:${agentId}:${bucket}`,
    })
  }
}

export async function generateCostSpikeAlerts(threshold = 150) {
  const since = new Date(Date.now() - 24 * 86400000)
  const rows = await db.select().from(apiLog).where(gte(apiLog.createdAt, since))
  const costs = new Map<string, number>()
  for (const row of rows) {
    const key = row.organizationId || 'global'
    costs.set(key, (costs.get(key) || 0) + (row.cost || 0))
  }
  const day = new Date().toISOString().slice(0, 10)

  for (const [organizationId, cost] of costs) {
    if (cost < threshold)
      continue
    await createUnreadAlertOnce({
      type: 'cost_spike',
      severity: 'warning',
      title: 'Cost spike detected',
      message: `API cost reached ${cost} in the last 24 hours.`,
      organizationId: organizationId === 'global' ? null : organizationId,
      resourceId: `cost-spike:${organizationId}:${day}`,
    })
  }
}

export async function generateRuleBasedAlerts(tier: 'realtime' | 'daily' | 'all' = 'all') {
  const realtimeRuleTypes = new Set([
    'error_spike',
    'rate_limit',
    'mcp_unavailable',
    'channel_down',
    'credential_exhausted',
    'agent_error',
    'cost_spike',
  ])
  const dailyRuleTypes = new Set([
    'quota_warning',
    'key_expiring',
    'key_expired',
    'tenant_expiring',
    'knowledge_storage',
  ])

  const rules = await db.select().from(alertRule).where(eq(alertRule.enabled, true))
  for (const rule of rules) {
    if (tier === 'realtime' && !realtimeRuleTypes.has(rule.type))
      continue
    if (tier === 'daily' && !dailyRuleTypes.has(rule.type))
      continue

    const condition = (rule.condition || {}) as { threshold?: number }
    const threshold = condition.threshold ?? 90
    const notifyChannels = Array.isArray(rule.notifyChannels) ? rule.notifyChannels : []

    if (rule.type === 'quota_warning') {
      const orgs = await db.select().from(organization).where(eq(organization.enabled, true))
      for (const org of orgs) {
        if (rule.organizationId && org.id !== rule.organizationId)
          continue
        if (org.tokenLimit <= 0)
          continue
        const usagePercent = Math.round((org.tokenUsed / org.tokenLimit) * 100)
        if (usagePercent < threshold)
          continue
        const tier = getQuotaAlertTier(usagePercent)
        const resourceId = getQuotaAlertResourceId(org.id, tier || threshold)

        const existing = await db
          .select()
          .from(alert)
          .where(
            and(
              eq(alert.type, 'quota_warning'),
              eq(alert.organizationId, org.id),
              eq(alert.resourceId, resourceId),
              activeAlertStatusCondition(),
            ),
          )
        if (existing.length > 0)
          continue

        const [newAlert] = await db
          .insert(alert)
          .values({
            type: 'quota_warning',
            severity: getQuotaAlertSeverityByTier(tier || threshold),
            title: `[规则] ${rule.name}`,
            message: `规则 "${rule.name}" 触发：组织 "${org.name}" 配额使用 ${usagePercent}%`,
            organizationId: org.id,
            resourceId,
          })
          .returning()
        if (newAlert)
          await notifyAlertSubscribers(newAlert.id, notifyChannels).catch(() => {})
      }
    }

    if (rule.type === 'key_expiring') {
      const days = threshold || 7
      const deadline = new Date(Date.now() + days * 86400000)
      const expiringKeys = await db
        .select()
        .from(apiKey)
        .where(and(eq(apiKey.status, 'active'), lt(apiKey.expiresAt, deadline), gte(apiKey.expiresAt, new Date())))
      for (const key of expiringKeys) {
        if (rule.organizationId && key.organizationId !== rule.organizationId)
          continue
        const existing = await db
          .select()
          .from(alert)
          .where(and(eq(alert.type, 'key_expiring'), eq(alert.resourceId, key.id), activeAlertStatusCondition()))
        if (existing.length > 0)
          continue

        const [newAlert] = await db
          .insert(alert)
          .values({
            type: 'key_expiring',
            severity: 'warning',
            title: `[规则] ${rule.name}`,
            message: `规则 "${rule.name}" 触发：密钥 "${key.name}" 即将过期`,
            organizationId: key.organizationId,
            userId: key.userId,
            resourceId: key.id,
          })
          .returning()
        if (newAlert)
          await notifyAlertSubscribers(newAlert.id, notifyChannels).catch(() => {})
      }
    }

    if (rule.type === 'key_expired') {
      const expiredKeys = await db
        .select()
        .from(apiKey)
        .where(or(eq(apiKey.status, 'expired'), and(eq(apiKey.status, 'active'), lt(apiKey.expiresAt, new Date()))))
      for (const key of expiredKeys) {
        if (!ruleMatchesOrganization(rule, key.organizationId))
          continue
        await createRuleAlert(rule, {
          type: 'key_expired',
          severity: 'critical',
          message: `API key "${key.name}" is expired.`,
          organizationId: key.organizationId,
          userId: key.userId,
          resourceId: `key-expired:${key.id}`,
        })
      }
    }

    if (rule.type === 'tenant_expiring') {
      const days = threshold || 14
      const deadline = new Date(Date.now() + days * 86400000)
      const orgs = await db
        .select()
        .from(organization)
        .where(and(eq(organization.tenantStatus, 'active'), gte(organization.expireTime, new Date()), lt(organization.expireTime, deadline)))
      for (const org of orgs) {
        if (!ruleMatchesOrganization(rule, org.id))
          continue
        await createRuleAlert(rule, {
          type: 'tenant_expiring',
          severity: days <= 1 ? 'critical' : 'warning',
          message: `Tenant "${org.name}" will expire within ${days} day(s).`,
          organizationId: org.id,
          resourceId: `tenant-expiring:${org.id}:${days}`,
        })
      }
    }

    if (rule.type === 'channel_down' && !rule.organizationId) {
      const rows = await db
        .select()
        .from(channel)
        .where(and(eq(channel.status, 'enabled'), or(eq(channel.health, 'down'), eq(channel.health, 'degraded'))))
      for (const row of rows) {
        await createRuleAlert(rule, {
          type: 'channel_down',
          severity: row.health === 'down' ? 'critical' : 'warning',
          message: `Channel "${row.name}" health is ${row.health}.`,
          resourceId: `channel-down:${row.id}:${row.health}`,
        })
      }
    }

    if (rule.type === 'credential_exhausted' && !rule.organizationId) {
      const rows = await db.select().from(channelCredential).where(eq(channelCredential.status, 'exhausted'))
      for (const row of rows) {
        await createRuleAlert(rule, {
          type: 'credential_exhausted',
          severity: 'critical',
          message: `Channel credential "${row.name}" is exhausted.`,
          resourceId: `credential-exhausted:${row.id}`,
        })
      }
    }

    if (rule.type === 'mcp_unavailable') {
      const rows = await db
        .select()
        .from(mcpTool)
        .where(or(eq(mcpTool.connectionStatus, 'failed'), eq(mcpTool.healthStatus, 'down'), eq(mcpTool.healthStatus, 'degraded')))
      for (const row of rows) {
        if (!ruleMatchesOrganization(rule, row.organizationId))
          continue
        await createRuleAlert(rule, {
          type: 'mcp_unavailable',
          severity: row.healthStatus === 'down' || row.connectionStatus === 'failed' ? 'critical' : 'warning',
          message: row.lastError || `MCP tool "${row.name}" is unavailable.`,
          organizationId: row.organizationId,
          resourceId: `mcp-unavailable:${row.id}`,
        })
      }
    }

    if (rule.type === 'knowledge_storage') {
      const [instances, bases] = await Promise.all([
        db.select().from(storageInstance).where(eq(storageInstance.status, 'active')),
        db.select().from(knowledgeBase).where(eq(knowledgeBase.enabled, true)),
      ])
      const capacityByStorage = new Map(
        instances
          .map((item) => {
            const config = (item.config || {}) as Record<string, unknown>
            const capacity = Number(config.capacityBytes ?? config.maxBytes ?? config.storageLimitBytes)
            return Number.isFinite(capacity) && capacity > 0 ? [item.id, capacity] as const : null
          })
          .filter(Boolean) as Array<readonly [string, number]>,
      )
      for (const kb of bases) {
        if (!ruleMatchesOrganization(rule, kb.organizationId))
          continue
        const capacity = kb.storageInstanceId ? capacityByStorage.get(kb.storageInstanceId) : undefined
        if (!capacity)
          continue
        const usedPercent = Math.round(((kb.size || 0) / capacity) * 100)
        if (usedPercent < threshold)
          continue
        await createRuleAlert(rule, {
          type: 'knowledge_storage',
          severity: usedPercent >= 100 ? 'critical' : 'warning',
          message: `Knowledge base "${kb.name}" uses ${usedPercent}% of configured storage capacity.`,
          organizationId: kb.organizationId,
          resourceId: `knowledge-storage:${kb.id}:${threshold}`,
        })
      }
    }

    if (rule.type === 'error_spike' || rule.type === 'rate_limit') {
      const since = new Date(Date.now() - 5 * 60000)
      const rows = rule.type === 'error_spike'
        ? await db
            .select()
            .from(apiLog)
            .where(and(gte(apiLog.createdAt, since), or(eq(apiLog.status, 'error'), gte(apiLog.statusCode, 500))))
        : await db
            .select()
            .from(apiLog)
            .where(and(gte(apiLog.createdAt, since), or(eq(apiLog.status, 'rate_limited'), eq(apiLog.statusCode, 429))))
      const counts = countBy(rows.filter(row => ruleMatchesOrganization(rule, row.organizationId)), row => row.organizationId || 'global')
      const bucket = Math.floor(Date.now() / 300000)
      for (const [organizationId, count] of counts) {
        if (count < threshold)
          continue
        await createRuleAlert(rule, {
          type: rule.type,
          severity: rule.type === 'error_spike' ? 'critical' : 'warning',
          message: `${count} ${rule.type === 'error_spike' ? 'failed' : 'rate-limited'} API calls detected in the last 5 minutes.`,
          organizationId: organizationId === 'global' ? null : organizationId,
          resourceId: `${rule.type}:${organizationId}:${bucket}`,
        })
      }
    }

    if (rule.type === 'agent_error') {
      const since = new Date(Date.now() - 5 * 60000)
      const rows = await db
        .select()
        .from(apiLog)
        .where(and(eq(apiLog.type, 'agent_chat'), eq(apiLog.status, 'error'), gte(apiLog.createdAt, since)))
      const agentRows = rows.length > 0 ? await db.select().from(agent) : []
      const agentsById = new Map(agentRows.map(row => [row.id, row]))
      const filteredRows = rows.filter((row) => {
        const agentRow = row.agentId ? agentsById.get(row.agentId) : undefined
        return ruleMatchesOrganization(rule, agentRow?.organizationId)
      })
      const counts = countBy(filteredRows, row => row.agentId || 'unknown')
      const bucket = Math.floor(Date.now() / 300000)
      for (const [agentId, count] of counts) {
        if (count < threshold)
          continue
        const agentRow = agentsById.get(agentId)
        await createRuleAlert(rule, {
          type: 'agent_error',
          severity: 'warning',
          message: `${count} agent chat errors detected in the last 5 minutes.`,
          organizationId: agentRow?.organizationId ?? null,
          resourceId: `agent-error:${agentId}:${bucket}`,
        })
      }
    }

    if (rule.type === 'cost_spike') {
      const since = new Date(Date.now() - 24 * 86400000)
      const rows = await db.select().from(apiLog).where(gte(apiLog.createdAt, since))
      const costs = new Map<string, number>()
      for (const row of rows.filter(row => ruleMatchesOrganization(rule, row.organizationId))) {
        const key = row.organizationId || 'global'
        costs.set(key, (costs.get(key) || 0) + (row.cost || 0))
      }
      const day = new Date().toISOString().slice(0, 10)
      for (const [organizationId, cost] of costs) {
        if (cost < threshold)
          continue
        await createRuleAlert(rule, {
          type: 'cost_spike',
          severity: 'warning',
          message: `API cost reached ${cost} in the last 24 hours.`,
          organizationId: organizationId === 'global' ? null : organizationId,
          resourceId: `cost-spike:${organizationId}:${day}`,
        })
      }
    }
  }
}

export async function runRealtimeAlertChecks() {
  await generateRuleBasedAlerts('realtime')
  await generateChannelDownAlerts()
  await generateCredentialExhaustedAlerts()
  await generateMcpUnavailableAlerts()
  await generateErrorSpikeAlerts()
  await generateRateLimitAlerts()
  await generateAgentErrorAlerts()
}

export async function runDailyAlertChecks() {
  await generateRuleBasedAlerts('daily')
  await generateQuotaAlerts()
  await generateKeyExpiryAlerts()
  await generateExpiredKeyAlerts()
  await generateTenantExpiryAlerts()
  await generateKnowledgeStorageAlerts()
  await generateCostSpikeAlerts()
}

export async function runAlertChecks() {
  await runRealtimeAlertChecks()
  await runDailyAlertChecks()
}
