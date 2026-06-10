import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import billingDetailHandler from '../billing/[id].get'

import { asResponse, createMockEvent } from './nitro-test-utils'

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
  },
  apiLog: {
    organizationId: 'organizationId',
    createdAt: 'createdAt',
    model: 'model',
    totalTokens: 'totalTokens',
    cost: 'cost',
  },
  organization: {
    id: 'id',
    name: 'name',
  },
}))

function createRecordSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createBreakdownSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

function createOrgSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate billing detail handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('billing [id].get', () => {
    it('should return 404 when billing record not found', async () => {
      mockSelect.mockReturnValue(createRecordSelectChain([]))

      const response = await billingDetailHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('账单不存在')
    })

    it('should return billing detail with breakdowns scoped to organization', async () => {
      const record = {
        id: 'bill-1',
        organizationId: 'org-1',
        period: '2026-06',
        totalCost: 1000,
      }
      const modelBreakdown = [{ model: 'gpt-4', requests: 10, tokens: 5000, cost: 800 }]
      const dailyBreakdown = [{ date: '2026-06-01', requests: 5, tokens: 2500, cost: 400 }]

      mockSelect
        .mockReturnValueOnce(createRecordSelectChain([record]))
        .mockReturnValueOnce(createBreakdownSelectChain(modelBreakdown))
        .mockReturnValueOnce(createBreakdownSelectChain(dailyBreakdown))
        .mockReturnValueOnce(createOrgSelectChain([{ name: 'Acme Corp' }]))

      const response = await billingDetailHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'bill-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        ...record,
        organizationName: 'Acme Corp',
        modelBreakdown,
        dailyBreakdown,
      })
      expect(mockSelect).toHaveBeenCalledTimes(4)
    })

    it('should return empty organization name when org not found', async () => {
      const record = {
        id: 'bill-2',
        organizationId: 'org-2',
        period: '2026-05',
      }

      mockSelect
        .mockReturnValueOnce(createRecordSelectChain([record]))
        .mockReturnValueOnce(createBreakdownSelectChain([]))
        .mockReturnValueOnce(createBreakdownSelectChain([]))
        .mockReturnValueOnce(createOrgSelectChain([]))

      const response = asResponse<any>(await billingDetailHandler(createMockEvent({
        params: { id: 'bill-2' },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.organizationName).toBe('')
    })
  })
})
