import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MCP_MARKETPLACE_PRESETS } from '#server/utils/mcp-marketplace'
import { RESPONSE_CODE } from '@/enums'
import apiLogListHandler from '../api-log/index.get'

import mcpInstallHandler from '../mcp-tool/install.post'
import marketplaceHandler from '../mcp-tool/marketplace.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiLog: {
    organizationId: 'organizationId',
    model: 'model',
    agentId: 'agentId',
    status: 'status',
    createdAt: 'createdAt',
  },
  mcpTool: { id: 'id' },
  insertMcpToolSchema: {
    parse: (value: unknown) => value,
  },
}))

function parseApiLogPagination(query: Record<string, string | undefined>) {
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

describe('aigate query handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('pure api-log pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseApiLogPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseApiLogPagination({ page: '3', pageSize: '25' })).toEqual({
        page: 3,
        pageSize: 25,
        offset: 50,
      })
    })
  })

  describe('mcp-tool marketplace.get', () => {
    it('should return marketplace presets', async () => {
      const response = await marketplaceHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(MCP_MARKETPLACE_PRESETS)
      expect(Array.isArray(response.data)).toBe(true)
      expect((response.data as unknown[]).length).toBeGreaterThan(0)
    })
  })

  describe('api-log index.get', () => {
    it('should return paginated logs scoped to organization', async () => {
      const logs = [{ id: 'log-1' }, { id: 'log-2' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 2 }]))
        .mockReturnValueOnce(createListSelectChain(logs))

      const event = createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '2', pageSize: '10', model: 'gpt', status: 'success' },
      })
      const response = await apiLogListHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items: logs,
        total: 2,
        page: 2,
        pageSize: 10,
      })
      expect(mockSelect).toHaveBeenCalledTimes(2)
    })

    it('should default pagination when query params are missing', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 0 }]))
        .mockReturnValueOnce(createListSelectChain([]))

      const response = await apiLogListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.data).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })
    })

    it('should allow admin to query logs without organization context', async () => {
      const logs = [{ id: 'global-log' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(logs))

      const response = await apiLogListHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          query: { page: '1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items: logs,
        total: 1,
        page: 1,
        pageSize: 20,
      })
    })

    it('should reject non-admin principals without organization context', async () => {
      const response = await apiLogListHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })
  })

  describe('mcp-tool install.post', () => {
    it('should return 404 when preset does not exist', async () => {
      const event = createMockEvent({ body: { presetId: 'missing-preset' } })
      const response = await mcpInstallHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.NOT_FOUND)
      expect(response.msg).toBe('预设工具不存在')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should install preset for organization principal', async () => {
      const installed = { id: 'tool-1', name: 'GitHub MCP' }
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([installed]),
        }),
      })

      const event = createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { presetId: 'preset-github' },
      })
      const response = await mcpInstallHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(installed)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })
})
