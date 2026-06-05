import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiKey: { userId: 'userId', status: 'status' },
}))

import { checkApiKeyLimit } from '#server/utils/api-key'

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

    it('should allow when user has no active keys', async () => {
      mockSelect.mockReturnValue(createCountSelectChain(0))

      const result = await checkApiKeyLimit('user-new')

      expect(result).toEqual({ current: 0, max: 3, allowed: true })
    })
  })
})
