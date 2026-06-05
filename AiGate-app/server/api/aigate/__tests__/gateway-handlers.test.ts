import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCacheKey, getCached, setCached } from '#server/utils/cache'

const GATEWAY_CACHE_TTL_MS = 60 * 1000

function getGatewayCacheKey(orgId: string | null | undefined): string {
  return createCacheKey('gateway', orgId)
}

function computeGatewayOverview(
  keys: Array<{ status: string }>,
  channels: Array<{ status: string, health: string }>,
  recentRequestCount: number,
  recentLogs: Array<{ status: string, latency: number | null }>,
) {
  const errorCount = recentLogs.filter(l => l.status === 'error').length
  const avgLatency = recentLogs.length
    ? Math.round(recentLogs.reduce((s, l) => s + (l.latency || 0), 0) / recentLogs.length)
    : 0

  return {
    activeKeys: keys.filter(k => k.status === 'active').length,
    totalKeys: keys.length,
    activeChannels: channels.filter(c => c.status === 'enabled').length,
    healthyChannels: channels.filter(c => c.health === 'healthy').length,
    requestsLastHour: recentRequestCount,
    errorRate: recentLogs.length ? Math.round((errorCount / recentLogs.length) * 100) : 0,
    avgLatency,
  }
}

describe('aigate gateway handler logic', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getGatewayCacheKey', () => {
    it('should prefix gateway namespace with organization id', () => {
      expect(getGatewayCacheKey('org-abc')).toBe('gateway:org-abc')
      expect(getGatewayCacheKey(null)).toBe('gateway:null')
      expect(getGatewayCacheKey(undefined)).toBe('gateway:null')
    })

    it('should isolate cache entries per organization', () => {
      expect(getGatewayCacheKey('org-1')).not.toBe(getGatewayCacheKey('org-2'))
    })
  })

  describe('gateway cache ttl', () => {
    it('should serve cached gateway payload within 60s TTL', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = getGatewayCacheKey('org-1')
      const payload = { overview: { activeKeys: 2 } }

      setCached(key, payload, GATEWAY_CACHE_TTL_MS)
      expect(getCached(key)).toEqual(payload)
    })

    it('should evict gateway cache after TTL expires', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = getGatewayCacheKey('org-1')
      setCached(key, { overview: { activeKeys: 1 } }, GATEWAY_CACHE_TTL_MS)

      vi.advanceTimersByTime(GATEWAY_CACHE_TTL_MS + 1)
      expect(getCached(key)).toBeNull()
    })
  })

  describe('computeGatewayOverview', () => {
    it('should aggregate keys, channels, and recent log metrics', () => {
      const overview = computeGatewayOverview(
        [{ status: 'active' }, { status: 'active' }, { status: 'revoked' }],
        [
          { status: 'enabled', health: 'healthy' },
          { status: 'enabled', health: 'unhealthy' },
          { status: 'disabled', health: 'healthy' },
        ],
        42,
        [
          { status: 'success', latency: 100 },
          { status: 'error', latency: 200 },
          { status: 'success', latency: 300 },
        ],
      )

      expect(overview).toEqual({
        activeKeys: 2,
        totalKeys: 3,
        activeChannels: 2,
        healthyChannels: 2,
        requestsLastHour: 42,
        errorRate: 33,
        avgLatency: 200,
      })
    })

    it('should return zero metrics when there are no recent logs', () => {
      expect(computeGatewayOverview([], [], 0, [])).toEqual({
        activeKeys: 0,
        totalKeys: 0,
        activeChannels: 0,
        healthyChannels: 0,
        requestsLastHour: 0,
        errorRate: 0,
        avgLatency: 0,
      })
    })
  })
})
