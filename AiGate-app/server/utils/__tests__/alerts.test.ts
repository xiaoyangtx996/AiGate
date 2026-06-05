import { describe, expect, it } from 'vitest'

function getQuotaUsagePercent(tokenUsed: number, tokenLimit: number) {
  if (tokenLimit <= 0) return 0
  return Math.round((tokenUsed / tokenLimit) * 100)
}

function shouldGenerateQuotaAlert(tokenLimit: number, usagePercent: number) {
  if (tokenLimit <= 0) return false
  return usagePercent >= 90
}

function getQuotaAlertSeverity(usagePercent: number) {
  return usagePercent >= 95 ? 'critical' : 'warning'
}

function formatQuotaAlertTitle(orgName: string) {
  return `配额预警：${orgName}`
}

function formatQuotaAlertMessage(orgName: string, usagePercent: number, tokenUsed: number, tokenLimit: number) {
  return `组织 "${orgName}" 配额使用已达 ${usagePercent}%（${tokenUsed}/${tokenLimit} tokens）`
}

function isKeyExpiringSoon(expiresAt: Date, now: Date, windowDays = 7) {
  const windowEnd = new Date(now.getTime() + windowDays * 86400000)
  return expiresAt >= now && expiresAt < windowEnd
}

function formatKeyExpiryAlertTitle(keyName: string) {
  return `密钥即将过期：${keyName}`
}

function formatKeyExpiryAlertMessage(keyName: string, expiresAt: Date) {
  return `密钥 "${keyName}" 将于 ${expiresAt.toISOString().split('T')[0]} 过期`
}

function getRuleThreshold(condition: { threshold?: number } | null | undefined, defaultThreshold = 90) {
  return condition?.threshold ?? defaultThreshold
}

function shouldTriggerRuleQuotaAlert(tokenLimit: number, usagePercent: number, threshold: number) {
  if (tokenLimit <= 0) return false
  return usagePercent >= threshold
}

function getKeyExpiryWindowDays(threshold: number) {
  return threshold || 7
}

function matchesRuleOrganizationFilter(ruleOrganizationId: string | null | undefined, targetOrganizationId: string) {
  return !ruleOrganizationId || ruleOrganizationId === targetOrganizationId
}

function formatRuleQuotaAlertTitle(ruleName: string) {
  return `[规则] ${ruleName}`
}

function formatRuleQuotaAlertMessage(ruleName: string, orgName: string, usagePercent: number) {
  return `规则 "${ruleName}" 触发：组织 "${orgName}" 配额使用 ${usagePercent}%`
}

function formatRuleKeyExpiryAlertTitle(ruleName: string) {
  return `[规则] ${ruleName}`
}

function formatRuleKeyExpiryAlertMessage(ruleName: string, keyName: string) {
  return `规则 "${ruleName}" 触发：密钥 "${keyName}" 即将过期`
}

function isKeyExpiringWithinDays(expiresAt: Date, now: Date, windowDays: number) {
  const windowEnd = new Date(now.getTime() + windowDays * 86400000)
  return expiresAt >= now && expiresAt < windowEnd
}

describe('alerts utils', () => {
  describe('quota alert logic', () => {
    it('getQuotaUsagePercent should calculate rounded usage', () => {
      expect(getQuotaUsagePercent(50, 100)).toBe(50)
      expect(getQuotaUsagePercent(91, 100)).toBe(91)
      expect(getQuotaUsagePercent(100, 0)).toBe(0)
    })

    it('shouldGenerateQuotaAlert should trigger at 90% when limit is set', () => {
      expect(shouldGenerateQuotaAlert(1000, 89)).toBe(false)
      expect(shouldGenerateQuotaAlert(1000, 90)).toBe(true)
      expect(shouldGenerateQuotaAlert(1000, 95)).toBe(true)
    })

    it('shouldGenerateQuotaAlert should ignore orgs without limits', () => {
      expect(shouldGenerateQuotaAlert(0, 100)).toBe(false)
      expect(shouldGenerateQuotaAlert(-1, 100)).toBe(false)
    })

    it('getQuotaAlertSeverity should escalate at 95%', () => {
      expect(getQuotaAlertSeverity(90)).toBe('warning')
      expect(getQuotaAlertSeverity(94)).toBe('warning')
      expect(getQuotaAlertSeverity(95)).toBe('critical')
      expect(getQuotaAlertSeverity(100)).toBe('critical')
    })

    it('should format quota alert title and message', () => {
      expect(formatQuotaAlertTitle('Acme Corp')).toBe('配额预警：Acme Corp')
      expect(formatQuotaAlertMessage('Acme Corp', 92, 920, 1000))
        .toBe('组织 "Acme Corp" 配额使用已达 92%（920/1000 tokens）')
    })
  })

  describe('key expiry alert logic', () => {
    const now = new Date('2026-06-05T12:00:00.000Z')

    it('isKeyExpiringSoon should match keys expiring within seven days', () => {
      const inThreeDays = new Date(now.getTime() + 3 * 86400000)
      const inTenDays = new Date(now.getTime() + 10 * 86400000)
      const yesterday = new Date(now.getTime() - 86400000)

      expect(isKeyExpiringSoon(inThreeDays, now)).toBe(true)
      expect(isKeyExpiringSoon(inTenDays, now)).toBe(false)
      expect(isKeyExpiringSoon(yesterday, now)).toBe(false)
    })

    it('should format key expiry alert title and message', () => {
      const expiresAt = new Date('2026-06-12T08:30:00.000Z')
      expect(formatKeyExpiryAlertTitle('Production Key')).toBe('密钥即将过期：Production Key')
      expect(formatKeyExpiryAlertMessage('Production Key', expiresAt))
        .toBe('密钥 "Production Key" 将于 2026-06-12 过期')
    })
  })

  describe('rule threshold logic', () => {
    it('getRuleThreshold should default to 90 when threshold is missing', () => {
      expect(getRuleThreshold(null)).toBe(90)
      expect(getRuleThreshold(undefined)).toBe(90)
      expect(getRuleThreshold({})).toBe(90)
    })

    it('getRuleThreshold should use configured threshold', () => {
      expect(getRuleThreshold({ threshold: 75 })).toBe(75)
      expect(getRuleThreshold({ threshold: 0 })).toBe(0)
    })

    it('shouldTriggerRuleQuotaAlert should respect custom thresholds', () => {
      expect(shouldTriggerRuleQuotaAlert(1000, 74, 75)).toBe(false)
      expect(shouldTriggerRuleQuotaAlert(1000, 75, 75)).toBe(true)
      expect(shouldTriggerRuleQuotaAlert(1000, 80, 75)).toBe(true)
    })

    it('shouldTriggerRuleQuotaAlert should ignore orgs without limits', () => {
      expect(shouldTriggerRuleQuotaAlert(0, 100, 75)).toBe(false)
      expect(shouldTriggerRuleQuotaAlert(-1, 100, 75)).toBe(false)
    })

    it('getKeyExpiryWindowDays should default to 7 when threshold is zero', () => {
      expect(getKeyExpiryWindowDays(0)).toBe(7)
      expect(getKeyExpiryWindowDays(14)).toBe(14)
    })

    it('matchesRuleOrganizationFilter should allow global and scoped rules', () => {
      expect(matchesRuleOrganizationFilter(undefined, 'org-1')).toBe(true)
      expect(matchesRuleOrganizationFilter(null, 'org-1')).toBe(true)
      expect(matchesRuleOrganizationFilter('org-1', 'org-1')).toBe(true)
      expect(matchesRuleOrganizationFilter('org-1', 'org-2')).toBe(false)
    })

    it('should format rule-based quota alert title and message', () => {
      expect(formatRuleQuotaAlertTitle('High Usage Rule')).toBe('[规则] High Usage Rule')
      expect(formatRuleQuotaAlertMessage('High Usage Rule', 'Acme Corp', 88))
        .toBe('规则 "High Usage Rule" 触发：组织 "Acme Corp" 配额使用 88%')
    })

    it('should format rule-based key expiry alert title and message', () => {
      expect(formatRuleKeyExpiryAlertTitle('Expiry Rule')).toBe('[规则] Expiry Rule')
      expect(formatRuleKeyExpiryAlertMessage('Expiry Rule', 'Staging Key'))
        .toBe('规则 "Expiry Rule" 触发：密钥 "Staging Key" 即将过期')
    })

    it('isKeyExpiringWithinDays should honor custom rule windows', () => {
      const now = new Date('2026-06-05T12:00:00.000Z')
      const inTenDays = new Date(now.getTime() + 10 * 86400000)
      const inTwentyDays = new Date(now.getTime() + 20 * 86400000)

      expect(isKeyExpiringWithinDays(inTenDays, now, 14)).toBe(true)
      expect(isKeyExpiringWithinDays(inTwentyDays, now, 14)).toBe(false)
    })
  })
})
