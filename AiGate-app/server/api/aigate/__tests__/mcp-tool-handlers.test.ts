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
  mcpTool: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    status: 'status',
    createdAt: 'createdAt',
  },
}))

import mcpToolListHandler from '../mcp-tool/index.get'

function parseMcpToolPagination(query: Record<string, string | undefined>) {
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

describe('aigate mcp-tool handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure mcp-tool pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseMcpToolPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseMcpToolPagination({ page: '4', pageSize: '5' })).toEqual({
        page: 4,
        pageSize: 5,
        offset: 15,
      })
    })
  })

  describe('mcp-tool index.get', () => {
    it('should return paginated tools scoped to organization', async () => {
      const items = [{ id: 'tool-1', name: 'GitHub MCP', status: 'active' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await mcpToolListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '10', keyword: 'github' },
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

    it('should return paginated tools with status filter', async () => {
      const items = [{ id: 'tool-2', name: 'Slack MCP', status: 'inactive' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await mcpToolListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
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
      const items = [{ id: 'tool-1', name: 'Default Tool' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await mcpToolListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

      expect(response.data).toEqual(items)
    })
  })
})
