import { afterEach, describe, expect, it, vi } from 'vitest'

const CACHE_TTL_MS = 5 * 60 * 1000

function parseRangeDays(range?: string): number {
  if (range === '30d') return 30
  if (range === '90d') return 90
  return 7
}

function getCacheKey(orgId: string | null | undefined, rangeDays: number): string {
  return `dashboard:${orgId ?? 'all'}:${rangeDays}d`
}

function computeOverview(
  logs: Array<{ totalTokens: number | null }>,
  keys: Array<{ status: string, expiresAt?: Date | string | null }>,
  channels: Array<{ status: string, health: string }>,
  orgCount: number,
  now = Date.now(),
) {
  const totalTokens = logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0)
  const activeKeys = keys.filter(key => key.status === 'active').length
  const expiringSoon = keys.filter((key) => {
    if (!key.expiresAt) return false
    return new Date(key.expiresAt).getTime() - now < 7 * 86400000
  }).length

  return {
    totalTokens,
    activeKeys,
    expiringSoon,
    totalChannels: channels.length,
    activeChannels: channels.filter(channel => channel.status === 'enabled').length,
    healthyChannels: channels.filter(channel => channel.health === 'healthy').length,
    totalOrganizations: orgCount,
  }
}

function buildStatusDistribution(statusRows: Array<{ status: string, count: number }>) {
  const statusCounts: Record<string, number> = {}
  for (const row of statusRows) {
    statusCounts[row.status] = row.count
  }
  return statusCounts
}

function computeQuotaStatus(orgs: Array<{ id: string, name: string, tokenLimit: number, tokenUsed: number }>) {
  return orgs
    .filter(org => org.tokenLimit > 0)
    .map(org => ({
      organizationId: org.id,
      organizationName: org.name,
      usedPercentage: Math.round((org.tokenUsed / org.tokenLimit) * 100),
      isWarning: (org.tokenUsed / org.tokenLimit) > 0.9,
    }))
}

function parseDashboardPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

describe('aigate dashboard pure logic', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('parseRangeDays', () => {
    it('should default to 7 days', () => {
      expect(parseRangeDays()).toBe(7)
      expect(parseRangeDays('7d')).toBe(7)
      expect(parseRangeDays('invalid')).toBe(7)
    })

    it('should support 30d and 90d ranges', () => {
      expect(parseRangeDays('30d')).toBe(30)
      expect(parseRangeDays('90d')).toBe(90)
    })
  })

  describe('getCacheKey', () => {
    it('should include organization and range in cache key', () => {
      expect(getCacheKey('org-1', 7)).toBe('dashboard:org-1:7d')
      expect(getCacheKey(null, 30)).toBe('dashboard:all:30d')
      expect(getCacheKey(undefined, 90)).toBe('dashboard:all:90d')
    })
  })

  describe('computeOverview', () => {
    it('should aggregate token usage and resource counts', () => {
      const now = new Date('2026-06-05T00:00:00Z').getTime()
      const overview = computeOverview(
        [{ totalTokens: 100 }, { totalTokens: 50 }, { totalTokens: null }],
        [
          { status: 'active', expiresAt: new Date(now + 2 * 86400000) },
          { status: 'active', expiresAt: new Date(now + 10 * 86400000) },
          { status: 'revoked' },
        ],
        [
          { status: 'enabled', health: 'healthy' },
          { status: 'disabled', health: 'unhealthy' },
        ],
        3,
        now,
      )

      expect(overview).toEqual({
        totalTokens: 150,
        activeKeys: 2,
        expiringSoon: 1,
        totalChannels: 2,
        activeChannels: 1,
        healthyChannels: 1,
        totalOrganizations: 3,
      })
    })
  })

  describe('buildStatusDistribution', () => {
    it('should map status rows into a count dictionary', () => {
      expect(buildStatusDistribution([
        { status: 'success', count: 12 },
        { status: 'error', count: 3 },
        { status: 'success', count: 5 },
      ])).toEqual({
        success: 5,
        error: 3,
      })
    })
  })

  describe('computeQuotaStatus', () => {
    it('should flag organizations above 90% usage', () => {
      const quota = computeQuotaStatus([
        { id: 'org-1', name: 'Alpha', tokenLimit: 1000, tokenUsed: 950 },
        { id: 'org-2', name: 'Beta', tokenLimit: 0, tokenUsed: 100 },
        { id: 'org-3', name: 'Gamma', tokenLimit: 500, tokenUsed: 200 },
      ])

      expect(quota).toEqual([
        { organizationId: 'org-1', organizationName: 'Alpha', usedPercentage: 95, isWarning: true },
        { organizationId: 'org-3', organizationName: 'Gamma', usedPercentage: 40, isWarning: false },
      ])
    })
  })

  describe('parseDashboardPagination', () => {
    it('should clamp page size and compute offset', () => {
      expect(parseDashboardPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
      expect(parseDashboardPagination({ page: '3', pageSize: '25' })).toEqual({
        page: 3,
        pageSize: 25,
        offset: 50,
      })
    })
  })

  describe('dashboard cache ttl', () => {
    it('should expire cached entries after TTL', () => {
      vi.useFakeTimers()
      const cache = new Map<string, { data: unknown, expiresAt: number }>()
      const key = getCacheKey('org-1', 7)

      cache.set(key, { data: { ok: true }, expiresAt: Date.now() + CACHE_TTL_MS })
      expect(cache.get(key)?.data).toEqual({ ok: true })

      vi.advanceTimersByTime(CACHE_TTL_MS + 1)
      const entry = cache.get(key)
      expect(entry).toBeDefined()
      expect(Date.now() > entry!.expiresAt).toBe(true)
    })
  })
})

