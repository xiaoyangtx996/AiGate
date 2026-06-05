import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCacheKey, getCached, setCached } from '../cache'

const CACHE_TTL_MS = 5 * 60 * 1000

/** dashboard/index.get 风格的缓存键 */
function getDashboardCacheKey(orgId: string | null | undefined, rangeDays: number): string {
  return createCacheKey('dashboard', orgId ?? 'all', `${rangeDays}d`)
}

describe('cache utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createCacheKey', () => {
    it('should join parts with colon and stringify nullish values', () => {
      expect(createCacheKey('dashboard', 'org-1', '7d')).toBe('dashboard:org-1:7d')
      expect(createCacheKey('dashboard', null, '30d')).toBe('dashboard:null:30d')
      expect(createCacheKey('dashboard', undefined, '90d')).toBe('dashboard:null:90d')
    })

    it('should build dashboard-style cache keys', () => {
      expect(getDashboardCacheKey('org-abc', 7)).toBe('dashboard:org-abc:7d')
      expect(getDashboardCacheKey(null, 30)).toBe('dashboard:all:30d')
    })
  })

  describe('getCached / setCached', () => {
    it('should store and retrieve cached data within TTL', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = getDashboardCacheKey('org-1', 7)
      const payload = { overview: { totalTokens: 100 } }

      setCached(key, payload, CACHE_TTL_MS)
      expect(getCached(key)).toEqual(payload)
    })

    it('should return null for missing cache entries', () => {
      expect(getCached(getDashboardCacheKey('missing', 7))).toBeNull()
    })

    it('should evict expired entries on read', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = getDashboardCacheKey('org-1', 7)
      setCached(key, { ok: true }, CACHE_TTL_MS)

      vi.advanceTimersByTime(CACHE_TTL_MS + 1)
      expect(getCached(key)).toBeNull()
    })
  })
})
