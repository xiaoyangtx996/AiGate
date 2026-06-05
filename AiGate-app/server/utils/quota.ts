import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

export async function checkQuota(organizationId: string, requestedTokens: number) {
  const [org] = await db.select().from(organization).where(eq(organization.id, organizationId))
  if (!org) { return { allowed: false, reason: '组织不存在' } }
  if (org.tokenLimit <= 0) { return { allowed: true, remaining: Infinity } }
  const remaining = org.tokenLimit - org.tokenUsed
  if (remaining <= 0) { return { allowed: false, reason: '配额已用尽', remaining: 0 } }
  if (requestedTokens > remaining) { return { allowed: false, reason: `配额不足，剩余 ${remaining} tokens`, remaining } }
  return { allowed: true, remaining }
}

export async function consumeQuota(organizationId: string, tokens: number) {
  await db.update(organization).set({
    tokenUsed: sql`${organization.tokenUsed} + ${tokens}`,
  }).where(eq(organization.id, organizationId))
}

export async function getQuotaStatus(organizationId: string) {
  const [org] = await db.select().from(organization).where(eq(organization.id, organizationId))
  if (!org) { return null }
  const usagePercent = org.tokenLimit > 0 ? Math.round((org.tokenUsed / org.tokenLimit) * 100) : 0
  return {
    organizationId: org.id,
    organizationName: org.name,
    tokenLimit: org.tokenLimit,
    tokenUsed: org.tokenUsed,
    remaining: Math.max(0, org.tokenLimit - org.tokenUsed),
    usagePercent,
    isWarning: usagePercent >= 90,
    isCritical: usagePercent >= 95,
  }
}
