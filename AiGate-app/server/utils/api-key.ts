import { and, count, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

const MAX_ACTIVE_KEYS_PER_USER = 3

export async function checkApiKeyLimit(userId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(apiKey)
    .where(and(eq(apiKey.userId, userId), eq(apiKey.status, 'active')))
  return {
    current: result.count,
    max: MAX_ACTIVE_KEYS_PER_USER,
    allowed: result.count < MAX_ACTIVE_KEYS_PER_USER,
  }
}

export function validateApiKeyFormat(key: string): boolean {
  return /^ag-(dev|staging|prod)-[0-9a-f]{32}$/.test(key)
}

export function generateApiKey(env: string = 'dev'): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  return `ag-${env}-${hex}`
}
