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
  apiKey: {
    organizationId: 'organizationId',
    name: 'name',
    status: 'status',
    createdAt: 'createdAt',
  },
  alert: {
    organizationId: 'organizationId',
    title: 'title',
    message: 'message',
    createdAt: 'createdAt',
  },
  mcpTool: {
    organizationId: 'organizationId',
    name: 'name',
    status: 'status',
    createdAt: 'createdAt',
  },
  member: {
    id: 'id',
    userId: 'userId',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
  },
  channel: {
    organizationId: 'organizationId',
    name: 'name',
    vendor: 'vendor',
    status: 'status',
    priority: 'priority',
  },
  user: {
    id: 'id',
    name: 'name',
    email: 'email',
    image: 'image',
  },
}))

import apiKeyListHandler from '../api-key/index.get'
import alertListHandler from '../alert/index.get'
import mcpToolListHandler from '../mcp-tool/index.get'
import memberListHandler from '../member/index.get'
import channelListHandler from '../channel/index.get'

function parseListPagination(query: Record<string, string | undefined>) {
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

function createMemberCountSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createMemberListSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(result),
            }),
          }),
        }),
      }),
    }),
  }
}

describe('aigate list handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pure list pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseListPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseListPagination({ page: '2', pageSize: '15' })).toEqual({
        page: 2,
        pageSize: 15,
        offset: 15,
      })
    })
  })

  describe('api-key index.get', () => {
    it('should return paginated items scoped to organization with filters', async () => {
      const items = [{ id: 'key-1', name: 'Prod Key' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await apiKeyListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '10', keyword: 'prod', status: 'active' },
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
      const items = [{ id: 'key-1' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await apiKeyListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

      expect(response.data).toEqual(items)
    })
  })

  describe('alert index.get', () => {
    it('should return paginated alerts with keyword filter', async () => {
      const items = [{ id: 'alert-1', title: 'Quota warning' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await alertListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '20', keyword: 'quota' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 1,
        pageSize: 20,
      })
    })
  })

  describe('mcp-tool index.get', () => {
    it('should return paginated tools with status filter', async () => {
      const items = [{ id: 'tool-1', name: 'GitHub MCP', status: 'active' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await mcpToolListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '3', pageSize: '5', status: 'active' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 3,
        pageSize: 5,
      })
    })
  })

  describe('channel index.get', () => {
    it('should return paginated channels scoped to organization with filters', async () => {
      const items = [{ id: 'ch-1', name: 'OpenAI', vendor: 'openai', status: 'active' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await channelListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '2', pageSize: '10', keyword: 'open', status: 'active' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items,
        total: 1,
        page: 2,
        pageSize: 10,
      })
      expect(mockSelect).toHaveBeenCalledTimes(2)
    })

    it('should return raw array when page query is missing', async () => {
      const items = [{ id: 'ch-1', name: 'OpenAI' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await channelListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

      expect(response.data).toEqual(items)
    })

    it('should clamp page size and default pagination values', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createListSelectChain([]))

      const response = await channelListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '0', pageSize: '500' },
      }))

      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 100,
      })
    })
  })

  describe('member index.get', () => {
    it('should return paginated members joined with user profile', async () => {
      const items = [{
        id: 'member-1',
        userId: 'user-1',
        organizationId: 'org-1',
        userName: 'Alice',
        userEmail: 'alice@example.com',
      }]
      mockSelect
        .mockReturnValueOnce(createMemberCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createMemberListSelectChain(items))

      const response = await memberListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '10', keyword: 'alice' },
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

    it('should default pagination when query params are missing', async () => {
      mockSelect
        .mockReturnValueOnce(createMemberCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createMemberListSelectChain([]))

      const response = await memberListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1' },
      }))

      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })
    })
  })
})
