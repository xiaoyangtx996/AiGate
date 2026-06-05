import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: {
    id: 'id',
    name: 'name',
    tokenLimit: 'tokenLimit',
    tokenUsed: 'tokenUsed',
  },
}))

import { checkQuota, consumeQuota, getQuotaStatus } from '../quota'

function createSelectWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

describe('quota utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkQuota', () => {
    it('should reject when organization does not exist', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([]))

      const result = await checkQuota('missing-org', 100)

      expect(result).toEqual({ allowed: false, reason: '组织不存在' })
    })

    it('should allow unlimited usage when tokenLimit is zero', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 0, tokenUsed: 500 },
      ]))

      const result = await checkQuota('org-1', 1000)

      expect(result).toEqual({ allowed: true, remaining: Infinity })
    })

    it('should reject when quota is exhausted', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 1000 },
      ]))

      const result = await checkQuota('org-1', 10)

      expect(result).toEqual({ allowed: false, reason: '配额已用尽', remaining: 0 })
    })

    it('should reject when requested tokens exceed remaining', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 950 },
      ]))

      const result = await checkQuota('org-1', 100)

      expect(result).toEqual({
        allowed: false,
        reason: '配额不足，剩余 50 tokens',
        remaining: 50,
      })
    })

    it('should allow when sufficient quota remains', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 200 },
      ]))

      const result = await checkQuota('org-1', 100)

      expect(result).toEqual({ allowed: true, remaining: 800 })
    })
  })

  describe('consumeQuota', () => {
    it('should increment tokenUsed for organization', async () => {
      const where = vi.fn().mockResolvedValue(undefined)
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({ where }),
      })

      await consumeQuota('org-1', 150)

      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(where).toHaveBeenCalledTimes(1)
    })
  })

  describe('getQuotaStatus', () => {
    it('should return null when organization does not exist', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([]))

      const result = await getQuotaStatus('missing-org')

      expect(result).toBeNull()
    })

    it('should return warning and critical flags based on usage percent', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', name: 'Alpha', tokenLimit: 1000, tokenUsed: 960 },
      ]))

      const result = await getQuotaStatus('org-1')

      expect(result).toEqual({
        organizationId: 'org-1',
        organizationName: 'Alpha',
        tokenLimit: 1000,
        tokenUsed: 960,
        remaining: 40,
        usagePercent: 96,
        isWarning: true,
        isCritical: true,
      })
    })

    it('should return zero usage percent when tokenLimit is zero', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-2', name: 'Beta', tokenLimit: 0, tokenUsed: 500 },
      ]))

      const result = await getQuotaStatus('org-2')

      expect(result).toEqual({
        organizationId: 'org-2',
        organizationName: 'Beta',
        tokenLimit: 0,
        tokenUsed: 500,
        remaining: 0,
        usagePercent: 0,
        isWarning: false,
        isCritical: false,
      })
    })
  })

  describe('quota display helpers', () => {
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

    it('getQuotaColor should return correct color tier', () => {
      const getQuotaColor = (pct: number) => pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
      expect(getQuotaColor(50)).toBe('success')
      expect(getQuotaColor(80)).toBe('warning')
      expect(getQuotaColor(95)).toBe('error')
    })
  })
})
