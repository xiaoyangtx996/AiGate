import { randomBytes } from 'node:crypto'
import { and, count, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

const MAX_ACTIVE_KEYS_PER_USER = 3
const apiKeyPattern = /^ag-(?:dev|staging|prod)-[0-9a-f]{32}$/

export async function checkApiKeyLimit(userId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(apiKey)
    .where(and(eq(apiKey.userId, userId), eq(apiKey.status, 'active')))
  const current = result?.count ?? 0
  return {
    current,
    max: MAX_ACTIVE_KEYS_PER_USER,
    allowed: current < MAX_ACTIVE_KEYS_PER_USER,
  }
}

export function validateApiKeyFormat(key: string): boolean {
  return apiKeyPattern.test(key)
}

export function generateApiKey(env: string = 'dev'): string {
  return `ag-${env}-${randomBytes(16).toString('hex')}`
}
