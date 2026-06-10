import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import modelListHandler from '../model/index.get'

import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  aiModel: {
    name: 'name',
    provider: 'provider',
    status: 'status',
  },
}))

function parseModelPagination(query: Record<string, string | undefined>) {
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

describe('aigate model list handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure model pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseModelPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseModelPagination({ page: '3', pageSize: '10' })).toEqual({
        page: 3,
        pageSize: 10,
        offset: 20,
      })
    })
  })

  describe('model index.get', () => {
    it('should return paginated models with keyword filter', async () => {
      const items = [{ id: 'model-1', name: 'GPT-4o', provider: 'openai', status: 'active' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await modelListHandler(createMockEvent({
        query: { page: '1', pageSize: '10', keyword: 'gpt' },
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

    it('should return paginated models with status filter', async () => {
      const items = [{ id: 'model-2', name: 'Claude 3.5', provider: 'anthropic', status: 'inactive' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await modelListHandler(createMockEvent({
        query: { page: '2', pageSize: '5', status: 'inactive' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 2,
        pageSize: 5,
      })
    })

    it('should return raw array when page query is missing', async () => {
      const items = [{ id: 'model-1', name: 'GPT-4o', provider: 'openai' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await modelListHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(items)
    })

    it('should return global model catalog without organization scoping', async () => {
      const items = [
        { id: 'model-1', name: 'GPT-4o', provider: 'openai' },
        { id: 'model-2', name: 'Claude 3.5', provider: 'anthropic' },
      ]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 2 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await modelListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '20' },
      }))

      expect(response.data).toEqual({
        items,
        total: 2,
        page: 1,
        pageSize: 20,
      })
      const listChain = mockSelect.mock.results[1]?.value
      expect(listChain.from).toHaveBeenCalledTimes(1)
    })

    it('should clamp page size and default pagination values', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createListSelectChain([]))

      const response = await modelListHandler(createMockEvent({
        query: { page: '0', pageSize: '500' },
      }))

      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 100,
      })
    })

    it('should return error response when database query fails', async () => {
      mockSelect.mockImplementation(() => {
        throw new Error('database unavailable')
      })

      const response = await modelListHandler(createMockEvent({
        query: { page: '1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(response.data).toBeInstanceOf(Error)
    })
  })
})
