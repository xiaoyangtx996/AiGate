import { describe, expect, it } from 'vitest'

describe('quota utils', () => {
  it('formatTokens should format correctly', () => {
    const formatTokens = (n: number) => {
      if (!n) return '0'
      return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
    }
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(500)).toBe('500')
    expect(formatTokens(1500)).toBe('2K')
    expect(formatTokens(1500000)).toBe('1.5M')
  })

  it('getQuotaPercent should calculate correctly', () => {
    const getQuotaPercent = (used: number, limit: number) => limit > 0 ? Math.round((used / limit) * 100) : 0
    expect(getQuotaPercent(50, 100)).toBe(50)
    expect(getQuotaPercent(90, 100)).toBe(90)
    expect(getQuotaPercent(0, 0)).toBe(0)
  })

  it('getQuotaColor should return correct color', () => {
    const getQuotaColor = (pct: number) => pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
    expect(getQuotaColor(50)).toBe('success')
    expect(getQuotaColor(80)).toBe('warning')
    expect(getQuotaColor(95)).toBe('error')
  })
})
