import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiLog: { totalTokens: 'totalTokens', cost: 'cost', organizationId: 'organizationId', createdAt: 'createdAt' },
  billingRecord: { id: 'id', organizationId: 'organizationId', period: 'period' },
  organization: { enabled: 'enabled', id: 'id' },
}))

import { generateBillingForPeriod, getCurrentPeriod } from '../billing'

function parseBillingPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return {
    year,
    month,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 1),
    dueDate: new Date(year, month, 15),
  }
}

function shouldSkipBillingRecord(tokenUsage: number, cost: number) {
  return tokenUsage === 0 && cost === 0
}

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function setupDbMocks(options: {
  orgs?: Array<{ id: string }>
  usageByOrg?: Record<string, { totalTokens: string | null, totalCost: string | null }>
  existingByOrg?: Record<string, { id: string } | undefined>
}) {
  const orgs = options.orgs ?? []
  const usageByOrg = options.usageByOrg ?? {}
  const existingByOrg = options.existingByOrg ?? {}

  const selectQueue: unknown[][] = [orgs]
  for (const org of orgs) {
    const usage = usageByOrg[org.id] ?? { totalTokens: null, totalCost: null }
    selectQueue.push([usage])

    const tokenUsage = Number(usage.totalTokens || 0)
    const cost = Number(usage.totalCost || 0)
    if (tokenUsage !== 0 || cost !== 0) {
      const existing = existingByOrg[org.id]
      selectQueue.push(existing ? [existing] : [])
    }
  }

  let queueIndex = 0
  mockSelect.mockImplementation(() => {
    const result = selectQueue[queueIndex] ?? []
    queueIndex++
    return createSelectChain(result)
  })

  mockInsert.mockImplementation(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }))

  mockUpdate.mockImplementation(() => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }))
}

describe('billing utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('pure billing helpers', () => {
    it('parseBillingPeriod should derive correct date boundaries', () => {
      const { startDate, endDate, dueDate } = parseBillingPeriod('2024-03')
      expect(startDate).toEqual(new Date(2024, 2, 1))
      expect(endDate).toEqual(new Date(2024, 3, 1))
      expect(dueDate).toEqual(new Date(2024, 3, 15))
    })

    it('shouldSkipBillingRecord should skip zero-usage orgs', () => {
      expect(shouldSkipBillingRecord(0, 0)).toBe(true)
      expect(shouldSkipBillingRecord(100, 0)).toBe(false)
      expect(shouldSkipBillingRecord(0, 1.5)).toBe(false)
    })
  })

  describe('getCurrentPeriod', () => {
    it('should return YYYY-MM for current month', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
      await expect(getCurrentPeriod()).resolves.toBe('2026-06')
    })

    it('should zero-pad single-digit months', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-05T12:00:00Z'))
      await expect(getCurrentPeriod()).resolves.toBe('2026-01')
    })
  })

  describe('generateBillingForPeriod', () => {
    it('should create billing records for orgs with usage', async () => {
      setupDbMocks({
        orgs: [{ id: 'org-1' }],
        usageByOrg: {
          'org-1': { totalTokens: '1500', totalCost: '2.5' },
        },
      })

      const result = await generateBillingForPeriod('2024-03')

      expect(result).toEqual({
        period: '2024-03',
        created: 1,
        updated: 0,
        totalOrgs: 1,
      })
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should update existing billing records', async () => {
      setupDbMocks({
        orgs: [{ id: 'org-1' }],
        usageByOrg: {
          'org-1': { totalTokens: '2000', totalCost: '3.0' },
        },
        existingByOrg: {
          'org-1': { id: 'bill-1' },
        },
      })

      const result = await generateBillingForPeriod('2024-03')

      expect(result).toEqual({
        period: '2024-03',
        created: 0,
        updated: 1,
        totalOrgs: 1,
      })
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should skip orgs with zero usage and cost', async () => {
      setupDbMocks({
        orgs: [{ id: 'org-1' }, { id: 'org-2' }],
        usageByOrg: {
          'org-1': { totalTokens: '0', totalCost: '0' },
          'org-2': { totalTokens: '500', totalCost: '1.0' },
        },
      })

      const result = await generateBillingForPeriod('2024-03')

      expect(result).toEqual({
        period: '2024-03',
        created: 1,
        updated: 0,
        totalOrgs: 2,
      })
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should return zero created/updated when no enabled orgs have usage', async () => {
      setupDbMocks({
        orgs: [{ id: 'org-1' }],
        usageByOrg: {
          'org-1': { totalTokens: null, totalCost: null },
        },
      })

      const result = await generateBillingForPeriod('2024-03')

      expect(result).toEqual({
        period: '2024-03',
        created: 0,
        updated: 0,
        totalOrgs: 1,
      })
      expect(mockInsert).not.toHaveBeenCalled()
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })
})
