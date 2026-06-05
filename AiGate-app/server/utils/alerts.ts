import { and, count, eq, gte, lt } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert, alertRule, apiKey, organization } from '@/db/schema'
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

export async function generateRuleBasedAlerts() {
  const rules = await db.select().from(alertRule).where(eq(alertRule.enabled, true))
  for (const rule of rules) {
    const condition = (rule.condition || {}) as { threshold?: number }
    const threshold = condition.threshold ?? 90

    if (rule.type === 'quota_warning') {
      const orgs = await db.select().from(organization).where(eq(organization.enabled, true))
      for (const org of orgs) {
        if (rule.organizationId && org.id !== rule.organizationId) continue
        if (org.tokenLimit <= 0) continue
        const usagePercent = Math.round((org.tokenUsed / org.tokenLimit) * 100)
        if (usagePercent < threshold) continue

        const existing = await db.select().from(alert).where(
          and(eq(alert.type, 'quota_warning'), eq(alert.organizationId, org.id), eq(alert.read, false)),
        )
        if (existing.length > 0) continue

        const [newAlert] = await db.insert(alert).values({
          type: 'quota_warning',
          severity: usagePercent >= 95 ? 'critical' : 'warning',
          title: `[规则] ${rule.name}`,
          message: `规则 "${rule.name}" 触发：组织 "${org.name}" 配额使用 ${usagePercent}%`,
          organizationId: org.id,
        }).returning()
        await notifyAlertSubscribers(newAlert.id).catch(() => {})
      }
    }

    if (rule.type === 'key_expiring') {
      const days = threshold || 7
      const deadline = new Date(Date.now() + days * 86400000)
      const expiringKeys = await db.select().from(apiKey).where(
        and(eq(apiKey.status, 'active'), lt(apiKey.expiresAt, deadline), gte(apiKey.expiresAt, new Date())),
      )
      for (const key of expiringKeys) {
        if (rule.organizationId && key.organizationId !== rule.organizationId) continue
        const existing = await db.select().from(alert).where(
          and(eq(alert.type, 'key_expiring'), eq(alert.resourceId, key.id), eq(alert.read, false)),
        )
        if (existing.length > 0) continue

        const [newAlert] = await db.insert(alert).values({
          type: 'key_expiring',
          severity: 'warning',
          title: `[规则] ${rule.name}`,
          message: `规则 "${rule.name}" 触发：密钥 "${key.name}" 即将过期`,
          organizationId: key.organizationId,
          userId: key.userId,
          resourceId: key.id,
        }).returning()
        await notifyAlertSubscribers(newAlert.id).catch(() => {})
      }
    }
  }
}

export async function runAlertChecks() {
  await generateRuleBasedAlerts()
  await generateQuotaAlerts()
  await generateKeyExpiryAlerts()
}
