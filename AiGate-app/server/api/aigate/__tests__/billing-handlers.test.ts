import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  billingRecord: {
    id: 'id',
    organizationId: 'organizationId',
    period: 'period',
    createdAt: 'createdAt',
  },
}))

import billingListHandler from '../billing/index.get'

function parseBillingPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return {
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 1),
  }
}

function isValidBillingPeriod(period: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
}

function createCountSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createListSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

describe('aigate billing handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure billing pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseBillingPagination({ page: '-1', pageSize: '200' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseBillingPagination({ page: '3', pageSize: '10' })).toEqual({
        page: 3,
        pageSize: 10,
        offset: 20,
      })
    })
  })

  describe('pure billing period helpers', () => {
    it('parsePeriod should derive billing window dates from YYYY-MM', () => {
      const { startDate, endDate } = parsePeriod('2026-06')

      expect(startDate).toEqual(new Date(2026, 5, 1))
      expect(endDate).toEqual(new Date(2026, 6, 1))
    })

    it('isValidBillingPeriod should validate YYYY-MM format', () => {
      expect(isValidBillingPeriod('2026-06')).toBe(true)
      expect(isValidBillingPeriod('2026-13')).toBe(false)
      expect(isValidBillingPeriod('2026-6')).toBe(false)
    })
  })

  describe('billing index.get', () => {
    it('should return paginated billing records scoped to organization', async () => {
      const items = [{ id: 'bill-1', period: '2026-06', organizationId: 'org-1' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '10' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 10,
      })
      expect(mockSelect).toHaveBeenCalledTimes(2)
    })

    it('should return raw array when page query is missing', async () => {
      const items = [{ id: 'bill-1', period: '2026-05' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

      expect(response.data).toEqual(items)
    })

    it('should query without organization filter when principal has no organization', async () => {
      const items = [{ id: 'bill-global', period: '2026-04' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await billingListHandler(createMockEvent({
        query: { page: '1', pageSize: '20' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 20,
      })
    })

    it('should treat null organizationId as unscoped query', async () => {
      const items = [{ id: 'bill-null-org', period: '2026-03' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: null } },
        query: { page: '1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 20,
      })
    })

    it('should default page and clamp negative pageSize to minimum of 1', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createListSelectChain([]))

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: 'abc', pageSize: '-5' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 1,
      })
    })

    it('should clamp pageSize to maximum of 100', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createListSelectChain([]))

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '2', pageSize: '500' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 2,
        pageSize: 100,
      })
    })

    it('should default total to 0 when count row is missing', async () => {
      const items = [{ id: 'bill-2', period: '2026-02' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '10' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 0,
        page: 1,
        pageSize: 10,
      })
    })

    it('should return responseError when db throws', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Database unavailable')),
        }),
      })

      const response = await billingListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Database unavailable')
    })
  })
})
