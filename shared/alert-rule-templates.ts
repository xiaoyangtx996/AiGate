export type AlertNotifyChannel = 'in_app' | 'email'
export type AlertRuleType
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

export interface AlertRuleTemplate {
  id: string
  type: AlertRuleType
  threshold: number
  notifyChannels: AlertNotifyChannel[]
}

export const alertRuleTemplates: AlertRuleTemplate[] = [
  {
    id: 'quota_70',
    type: 'quota_warning',
    threshold: 70,
    notifyChannels: ['in_app'],
  },
  {
    id: 'quota_90',
    type: 'quota_warning',
    threshold: 90,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'quota_100',
    type: 'quota_warning',
    threshold: 100,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'key_expiring_7',
    type: 'key_expiring',
    threshold: 7,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'key_expiring_1',
    type: 'key_expiring',
    threshold: 1,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'key_expired',
    type: 'key_expired',
    threshold: 0,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'tenant_expiring_14',
    type: 'tenant_expiring',
    threshold: 14,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'tenant_expiring_7',
    type: 'tenant_expiring',
    threshold: 7,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'error_spike_5xx',
    type: 'error_spike',
    threshold: 10,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'rate_limit_spike',
    type: 'rate_limit',
    threshold: 10,
    notifyChannels: ['in_app'],
  },
  {
    id: 'mcp_unavailable',
    type: 'mcp_unavailable',
    threshold: 1,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'knowledge_storage_80',
    type: 'knowledge_storage',
    threshold: 80,
    notifyChannels: ['in_app'],
  },
  {
    id: 'agent_error',
    type: 'agent_error',
    threshold: 5,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'channel_down',
    type: 'channel_down',
    threshold: 1,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'credential_exhausted',
    type: 'credential_exhausted',
    threshold: 1,
    notifyChannels: ['in_app', 'email'],
  },
  {
    id: 'cost_spike',
    type: 'cost_spike',
    threshold: 150,
    notifyChannels: ['in_app'],
  },
]

const defaultTemplate: AlertRuleTemplate = {
  id: 'quota_90',
  type: 'quota_warning',
  threshold: 90,
  notifyChannels: ['in_app', 'email'],
}

export function getAlertRuleTemplate(id?: string | null) {
  return alertRuleTemplates.find(template => template.id === id) ?? defaultTemplate
}

export function normalizeNotifyChannels(channels: unknown): AlertNotifyChannel[] {
  if (!Array.isArray(channels))
    return [...defaultTemplate.notifyChannels]

  const normalized = channels.filter(
    (channel): channel is AlertNotifyChannel => channel === 'in_app' || channel === 'email',
  )

  return normalized.length ? normalized : ['in_app']
}

export function normalizeAlertRuleInput(body: {
  name?: string
  type?: string
  enabled?: boolean
  condition?: { threshold?: number, templateId?: string } | null
  notifyChannels?: unknown
}) {
  const template = getAlertRuleTemplate(body.condition?.templateId)
  const threshold = Number.isFinite(body.condition?.threshold) ? Number(body.condition?.threshold) : template.threshold
  const name = body.name?.trim() || `${template.type}:${threshold}`

  return {
    name,
    type: body.type || template.type,
    enabled: body.enabled ?? true,
    condition: {
      ...(body.condition || {}),
      templateId: body.condition?.templateId ?? template.id,
      threshold,
    },
    notifyChannels: normalizeNotifyChannels(body.notifyChannels ?? template.notifyChannels),
  }
}

export function normalizeAlertRuleUpdateInput(body: {
  name?: string
  type?: string
  enabled?: boolean
  condition?: { threshold?: number, templateId?: string } | null
  notifyChannels?: unknown
}) {
  const update: Record<string, unknown> = {}

  if ('name' in body)
    update.name = body.name
  if ('enabled' in body)
    update.enabled = body.enabled

  const template = getAlertRuleTemplate(body.condition?.templateId)
  if ('type' in body || body.condition?.templateId)
    update.type = body.type || template.type
  if ('condition' in body) {
    if (body.condition?.templateId) {
      update.condition = {
        ...body.condition,
        templateId: body.condition.templateId,
        threshold: Number.isFinite(body.condition.threshold) ? Number(body.condition.threshold) : template.threshold,
      }
    }
    else {
      update.condition = body.condition || {}
    }
  }
  if ('notifyChannels' in body)
    update.notifyChannels = normalizeNotifyChannels(body.notifyChannels)

  return update
}
