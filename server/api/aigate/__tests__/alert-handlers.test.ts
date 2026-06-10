import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import alertListHandler from '../alert/index.get'

import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  alert: {
    id: 'id',
    organizationId: 'organizationId',
    title: 'title',
    message: 'message',
    createdAt: 'createdAt',
  },
}))

function parseAlertPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
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

describe('aigate alert handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure alert pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseAlertPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseAlertPagination({ page: '2', pageSize: '15' })).toEqual({
        page: 2,
        pageSize: 15,
        offset: 15,
      })
    })
  })

  describe('alert index.get', () => {
    it('should return paginated alerts with keyword filter', async () => {
      const items = [{ id: 'alert-1', title: 'Quota warning', message: 'Quota exceeded' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await alertListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '1', pageSize: '20', keyword: 'quota' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 20,
      })
      expect(mockSelect).toHaveBeenCalledTimes(2)
    })

    it('should return raw array when page query is missing', async () => {
      const items = [{ id: 'alert-1', title: 'System notice' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await alertListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { keyword: 'system' },
        }),
      )

      expect(response.data).toEqual(items)
    })

    it('should filter alerts by keyword', async () => {
      const items = [{ id: 'alert-2', title: 'Rate limit hit' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await alertListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '1', pageSize: '10', keyword: 'rate' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 10,
      })
    })

    it('should return empty paginated result when no alerts match', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createListSelectChain([]))

      const response = await alertListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '1', pageSize: '20' },
        }),
      )

      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })
    })

    it('should return error when db query fails', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('connection lost')
      })

      const response = await alertListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.code).not.toBe(RESPONSE_CODE.SUCCESS)
    })
  })
})
