import { and, count, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert, apiKey, organization } from '@/db/schema'
import { notifyAlertSubscribers } from '#server/utils/alert-notify'

export async function generateQuotaAlerts() {
  const orgs = await db.select().from(organization).where(eq(organization.enabled, true))
  for (const org of orgs) {
    if (org.tokenLimit <= 0) continue
    const usagePercent = Math.round((org.tokenUsed / org.tokenLimit) * 100)
    if (usagePercent >= 90) {
      const existing = await db.select().from(alert).where(
        and(
          eq(alert.type, 'quota_warning'),
          eq(alert.organizationId, org.id),
          eq(alert.read, false),
        ),
      )
      if (existing.length === 0) {
        const [newAlert] = await db.insert(alert).values({
          type: 'quota_warning',
          severity: usagePercent >= 95 ? 'critical' : 'warning',
          title: `配额预警：${org.name}`,
          message: `组织 "${org.name}" 配额使用已达 ${usagePercent}%（${org.tokenUsed}/${org.tokenLimit} tokens）`,
          organizationId: org.id,
        }).returning()
        await notifyAlertSubscribers(newAlert.id).catch(() => {})
      }
    }
  }
}

export async function generateKeyExpiryAlerts() {
  const sevenDaysLater = new Date(Date.now() + 7 * 86400000)
  const expiringKeys = await db.select().from(apiKey).where(
    and(
      eq(apiKey.status, 'active'),
      lt(apiKey.expiresAt, sevenDaysLater),
      gte(apiKey.expiresAt, new Date()),
    ),
  )
  for (const key of expiringKeys) {
    const existing = await db.select().from(alert).where(
      and(
        eq(alert.type, 'key_expiring'),
        eq(alert.resourceId, key.id),
        eq(alert.read, false),
      ),
    )
    if (existing.length === 0) {
      const [newAlert] = await db.insert(alert).values({
        type: 'key_expiring',
        severity: 'warning',
        title: `密钥即将过期：${key.name}`,
        message: `密钥 "${key.name}" 将于 ${key.expiresAt?.toISOString().split('T')[0]} 过期`,
        organizationId: key.organizationId,
        userId: key.userId,
        resourceId: key.id,
      }).returning()
      await notifyAlertSubscribers(newAlert.id).catch(() => {})
    }
  }
}

export async function runAlertChecks() {
  await generateQuotaAlerts()
  await generateKeyExpiryAlerts()
}
