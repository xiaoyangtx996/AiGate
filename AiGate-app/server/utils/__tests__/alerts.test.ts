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
})
