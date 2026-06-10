import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import promptListHandler from '../prompt/index.get'

import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  prompt: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
  },
}))

function parsePromptPagination(query: Record<string, string | undefined>) {
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

describe('aigate prompt handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure prompt pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parsePromptPagination({ page: '-1', pageSize: '200' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should default page and page size when query is empty', () => {
      expect(parsePromptPagination({})).toEqual({
        page: 1,
        pageSize: 20,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parsePromptPagination({ page: '2', pageSize: '25' })).toEqual({
        page: 2,
        pageSize: 25,
        offset: 25,
      })
    })
  })

  describe('prompt index.get', () => {
    it('should return paginated prompts with keyword filter', async () => {
      const items = [{ id: 'prompt-1', name: 'Onboarding template' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await promptListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '1', pageSize: '15', keyword: 'onboard' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 15,
      })
      expect(mockSelect).toHaveBeenCalledTimes(2)
    })

    it('should return raw array when page query is missing', async () => {
      const items = [{ id: 'prompt-1', name: 'Default' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await promptListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.data).toEqual(items)
    })
  })
})
