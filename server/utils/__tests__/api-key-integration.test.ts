import { beforeEach, describe, expect, it, vi } from 'vitest'

import { applyApiKeyDefaults, checkApiKeyLimit } from '#server/utils/api-key'

const mockSelect = vi.fn()
const mockGetSetting = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiKey: { userId: 'userId', status: 'status' },
}))

vi.mock('#server/utils/system-settings', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}))

function createCountSelectChain(count: number) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count }]),
    }),
  }
}

describe('api-key integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'apiKey.activeLimitPerUser')
        return Promise.resolve(3)
      if (key === 'apiKey.defaultExpireDays')
        return Promise.resolve(365)
      if (key === 'apiKey.defaultDailyLimit')
        return Promise.resolve(null)
      return Promise.resolve(undefined)
    })
  })

  describe('checkApiKeyLimit', () => {
    it('should allow when user has fewer than max active keys', async () => {
      mockSelect.mockReturnValue(createCountSelectChain(2))

      const result = await checkApiKeyLimit('user-1')

      expect(result).toEqual({ current: 2, max: 3, allowed: true })
    })

    it('should block when user reached max active keys', async () => {
      mockSelect.mockReturnValue(createCountSelectChain(3))

      const result = await checkApiKeyLimit('user-1')

      expect(result).toEqual({ current: 3, max: 3, allowed: false })
    })

    it('should use active key limit from system settings', async () => {
      mockGetSetting.mockImplementation((key: string) => Promise.resolve(key === 'apiKey.activeLimitPerUser' ? 5 : undefined))
      mockSelect.mockReturnValue(createCountSelectChain(4))

      const result = await checkApiKeyLimit('user-1')

      expect(result).toEqual({ current: 4, max: 5, allowed: true })
      expect(mockGetSetting).toHaveBeenCalledWith('apiKey.activeLimitPerUser')
    })

    it('should allow when user has no active keys', async () => {
      mockSelect.mockReturnValue(createCountSelectChain(0))

      const result = await checkApiKeyLimit('user-new')

      expect(result).toEqual({ current: 0, max: 3, allowed: true })
    })
  })

  describe('applyApiKeyDefaults', () => {
    it('should apply default expiry and daily limit from system settings', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-10T00:00:00Z'))
      mockGetSetting.mockImplementation((key: string) => {
        if (key === 'apiKey.defaultExpireDays')
          return Promise.resolve(30)
        if (key === 'apiKey.defaultDailyLimit')
          return Promise.resolve(500)
        return Promise.resolve(3)
      })

      const result = await applyApiKeyDefaults({ name: 'Key' }, 'org-1')

      expect(result.dailyLimit).toBe(500)
      expect(result.expiresAt?.toISOString()).toBe('2026-07-10T00:00:00.000Z')
      expect(mockGetSetting).toHaveBeenCalledWith('apiKey.defaultExpireDays', 'org-1')
      expect(mockGetSetting).toHaveBeenCalledWith('apiKey.defaultDailyLimit', 'org-1')
      vi.useRealTimers()
    })

    it('should preserve explicit expiry and daily limit', async () => {
      const expiresAt = new Date('2026-12-31T00:00:00Z')

      const result = await applyApiKeyDefaults({ expiresAt, dailyLimit: 10 }, 'org-1')

      expect(result.expiresAt).toBe(expiresAt)
      expect(result.dailyLimit).toBe(10)
    })
  })
})
