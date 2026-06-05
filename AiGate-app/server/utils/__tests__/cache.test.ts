import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCacheKey, getCached, setCached } from '../cache'

describe('memory cache utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('createCacheKey', () => {
    it('should join parts with colon separator', () => {
      expect(createCacheKey('gateway', 'org-1')).toBe('gateway:org-1')
      expect(createCacheKey('dashboard', null, 7)).toBe('dashboard:null:7')
      expect(createCacheKey('dashboard', undefined, 90)).toBe('dashboard:null:90')
    })
  })

  describe('getCached / setCached', () => {
    it('should store and retrieve cached data within TTL', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = createCacheKey('test', 'org-1')
      const payload = { overview: { totalTokens: 100 } }

      setCached(key, payload, 60_000)
      expect(getCached(key)).toEqual(payload)
    })

    it('should return null for missing cache entries', () => {
      expect(getCached(createCacheKey('missing', 'org-1'))).toBeNull()
    })

    it('should evict expired entries on read', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = createCacheKey('test', 'org-1')
      setCached(key, { ok: true }, 60_000)

      vi.advanceTimersByTime(60_001)
      expect(getCached(key)).toBeNull()
    })
  })
})
