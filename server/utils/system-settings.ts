import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { systemSetting } from '@/db/schema'

export const settingDefaults: Record<string, unknown> = {
  'base.platformName': 'AiGate',
  'base.logoUrl': '',
  'base.defaultLanguage': 'zh-CN',
  'apiKey.defaultExpireDays': 365,
  'apiKey.activeLimitPerUser': 3,
  'apiKey.defaultDailyLimit': null,
  'notify.emailRecipients': '',
  'notify.resendFrom': '',
  'notify.webhookUrl': '',
  'rag.chunkSize': 1000,
  'rag.chunkOverlap': 200,
  'rag.topK': 5,
  'rag.dedupStrategy': 'reject',
  'retention.apiLogDays': 180,
  'retention.operationLogDays': 365,
  'advanced.gatewayDebug': false,
  'advanced.sessionHours': 24,
  'bot.modelId': '',
  'alert-rule-templates': [],
}

const CACHE_TTL_MS = 60_000
const settingsCache = new Map<string, { value: unknown, expiresAt: number }>()

function cacheKey(key: string, orgId?: string | null) {
  return `${orgId || 'global'}:${key}`
}

export function clearSettingCache() {
  settingsCache.clear()
}

export async function getSetting<T = unknown>(key: string, orgId?: string | null): Promise<T> {
  const keyName = cacheKey(key, orgId)
  const cached = settingsCache.get(keyName)
  if (cached && cached.expiresAt > Date.now())
    return cached.value as T

  const rows = await db
    .select()
    .from(systemSetting)
    .where(
      orgId
        ? and(eq(systemSetting.key, key), or(eq(systemSetting.organizationId, orgId), isNull(systemSetting.organizationId)))
        : and(eq(systemSetting.key, key), isNull(systemSetting.organizationId)),
    )

  const orgSetting = orgId ? rows.find(row => row.organizationId === orgId) : undefined
  const globalSetting = rows.find(row => row.scope === 'global' && !row.organizationId)
  const value = orgSetting?.value ?? globalSetting?.value ?? settingDefaults[key]
  settingsCache.set(keyName, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value as T
}

export async function listSettings(keys?: string[], orgId?: string | null) {
  const rows = await db
    .select()
    .from(systemSetting)
    .where(
      keys?.length
        ? orgId
          ? and(
              inArray(systemSetting.key, keys),
              or(eq(systemSetting.organizationId, orgId), isNull(systemSetting.organizationId)),
            )
          : and(inArray(systemSetting.key, keys), isNull(systemSetting.organizationId))
        : orgId
          ? or(eq(systemSetting.organizationId, orgId), isNull(systemSetting.organizationId))
          : isNull(systemSetting.organizationId),
    )

  const byKey: Record<string, unknown> = { ...settingDefaults }
  for (const row of rows.filter(item => item.scope === 'global' && !item.organizationId))
    byKey[row.key] = row.value
  for (const row of rows.filter(item => orgId && item.organizationId === orgId))
    byKey[row.key] = row.value
  return byKey
}

export async function getSettingsMeta(orgId?: string | null) {
  const [latest] = await db
    .select({
      updatedAt: systemSetting.updatedAt,
      updatedBy: systemSetting.updatedBy,
    })
    .from(systemSetting)
    .where(
      orgId
        ? or(eq(systemSetting.organizationId, orgId), isNull(systemSetting.organizationId))
        : isNull(systemSetting.organizationId),
    )
    .orderBy(desc(systemSetting.updatedAt))
    .limit(1)
  return latest?.updatedAt
    ? { updatedAt: latest.updatedAt, updatedBy: latest.updatedBy ?? null }
    : null
}

export async function setSetting(params: {
  key: string
  value: unknown
  scope?: 'global' | 'org'
  organizationId?: string | null
  updatedBy?: string | null
}) {
  const scope = params.scope ?? (params.organizationId ? 'org' : 'global')
  const [existing] = await db
    .select()
    .from(systemSetting)
    .where(
      and(
        eq(systemSetting.scope, scope),
        eq(systemSetting.key, params.key),
        params.organizationId ? eq(systemSetting.organizationId, params.organizationId) : isNull(systemSetting.organizationId),
      ),
    )
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(systemSetting)
      .set({ value: params.value, updatedBy: params.updatedBy ?? null })
      .where(eq(systemSetting.id, existing.id))
      .returning()
    clearSettingCache()
    return updated
  }

  const [created] = await db
    .insert(systemSetting)
    .values({
      scope,
      key: params.key,
      value: params.value,
      organizationId: params.organizationId ?? null,
      updatedBy: params.updatedBy ?? null,
    })
    .returning()
  clearSettingCache()
  return created
}
