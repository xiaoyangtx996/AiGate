import { randomBytes } from 'node:crypto'
import { and, count, eq } from 'drizzle-orm'
import { getSetting } from '#server/utils/system-settings'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

const DEFAULT_MAX_ACTIVE_KEYS_PER_USER = 3
const apiKeyPattern = /^ag-(?:dev|staging|prod)-[0-9a-f]{32}$/

function normalizePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function addDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export async function checkApiKeyLimit(userId: string) {
  const max = normalizePositiveInteger(
    await getSetting<number>('apiKey.activeLimitPerUser').catch(() => DEFAULT_MAX_ACTIVE_KEYS_PER_USER),
    DEFAULT_MAX_ACTIVE_KEYS_PER_USER,
  )
  const [result] = await db
    .select({ count: count() })
    .from(apiKey)
    .where(and(eq(apiKey.userId, userId), eq(apiKey.status, 'active')))
  const current = result?.count ?? 0
  return {
    current,
    max,
    allowed: current < max,
  }
}

export function validateApiKeyFormat(key: string): boolean {
  return apiKeyPattern.test(key)
}

export function generateApiKey(env: string = 'dev'): string {
  return `ag-${env}-${randomBytes(16).toString('hex')}`
}

export async function applyApiKeyDefaults<T extends { expiresAt?: Date | null, dailyLimit?: number | null }>(
  body: T,
  organizationId?: string | null,
) {
  const [defaultExpireDays, defaultDailyLimit] = await Promise.all([
    getSetting<number>('apiKey.defaultExpireDays', organizationId).catch(() => 365),
    getSetting<number | null>('apiKey.defaultDailyLimit', organizationId).catch(() => null),
  ])
  const expireDays = Number(defaultExpireDays)
  const normalizedDailyLimit = defaultDailyLimit === null || defaultDailyLimit === undefined
    ? null
    : normalizePositiveInteger(defaultDailyLimit, 0) || null
  return {
    ...body,
    expiresAt: body.expiresAt ?? (Number.isFinite(expireDays) && expireDays > 0 ? addDays(Math.floor(expireDays)) : null),
    dailyLimit: body.dailyLimit ?? normalizedDailyLimit,
  }
}
