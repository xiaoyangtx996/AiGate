import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import mcpToolGetHandler from '../mcp-tool/[id].get'
import mcpToolListHandler from '../mcp-tool/index.get'

import mcpToolInstallHandler from '../mcp-tool/install.post'
import mcpToolMarketplaceHandler from '../mcp-tool/marketplace.get'
import mcpMarketplaceBatchInstallHandler from '../mcp-tool/marketplace/batch-install.post'
import mcpMarketplaceDetailHandler from '../mcp-tool/marketplace/[slug]/index.get'
import mcpMarketplaceInstallHandler from '../mcp-tool/marketplace/[slug]/install.post'
import mcpToolTestHandler from '../mcp-tool/test.post'
import { asResponse, createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockTransaction = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  mcpTool: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    status: 'status',
    type: 'type',
    config: 'config',
    sourceSlug: 'sourceSlug',
    createdAt: 'createdAt',
  },
  mcpToolVersion: {
    toolId: 'toolId',
    createdAt: 'createdAt',
  },
  insertMcpToolSchema: {
    parse: (data: unknown) => data,
  },
}))

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

function createToolSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
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

      const response = await mcpToolListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '1', pageSize: '10', keyword: 'github' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items: items.map(item => ({ ...item, versions: [] })),
        total: 1,
        page: 1,
        pageSize: 10,
      })
      expect(mockSelect).toHaveBeenCalledTimes(3)
    })

    it('should return paginated tools with status filter', async () => {
      const items = [{ id: 'tool-2', name: 'Slack MCP', status: 'inactive' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await mcpToolListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '2', pageSize: '5', status: 'inactive' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        items: items.map(item => ({ ...item, versions: [] })),
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

      const response = await mcpToolListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.data).toEqual(items.map(item => ({ ...item, versions: [] })))
    })

    it('should redact secret values from list responses', async () => {
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain([
          {
            id: 'tool-secret',
            name: 'Secret MCP',
            env: { GITHUB_TOKEN: 'ghp_secret_1234', LOG_LEVEL: 'debug' },
            authConfig: { token: 'bearer-secret-5678' },
            config: {
              endpoint: 'https://mcp.example.com/sse',
              env: { API_TOKEN: 'nested-secret-9999' },
              headers: { Authorization: 'Bearer header-secret-0000' },
            },
          },
        ]))

      const response = asResponse<any>(
        await mcpToolListHandler(
          createMockEvent({
            context: { principal: { organizationId: 'org-1' } },
            query: { page: '1' },
          }),
        ),
      )

      const item = response.data.items[0]
      expect(JSON.stringify(item)).not.toContain('ghp_secret_1234')
      expect(JSON.stringify(item)).not.toContain('bearer-secret-5678')
      expect(JSON.stringify(item)).not.toContain('nested-secret-9999')
      expect(JSON.stringify(item)).not.toContain('header-secret-0000')
      expect(item.env.GITHUB_TOKEN).toBe('****1234')
      expect(item.env.LOG_LEVEL).toBe('****ebug')
      expect(item.authConfig.token).toBe('****5678')
      expect(item.config.endpoint).toBe('https://mcp.example.com/sse')
      expect(item.config.headers.Authorization).toBe('****0000')
    })
  })

  describe('mcp-tool [id].get', () => {
    it('should redact secret values from detail and version responses', async () => {
      mockSelect
        .mockReturnValueOnce(createToolSelectChain([
          {
            id: 'tool-secret',
            name: 'Secret MCP',
            organizationId: 'org-1',
            env: { GITHUB_TOKEN: 'ghp_secret_1234' },
            authConfig: { password: 'plain-password' },
            config: { apiKey: 'sk-live-secret-abcd' },
          },
        ]))
        .mockReturnValueOnce(createToolSelectChain([
          {
            id: 'ver-1',
            toolId: 'tool-secret',
            config: { env: { VERSION_TOKEN: 'version-token-8888' } },
          },
        ]))

      const response = asResponse<any>(
        await mcpToolGetHandler(
          createMockEvent({
            context: { principal: { organizationId: 'org-1' } },
            params: { id: 'tool-secret' },
          }),
        ),
      )

      expect(JSON.stringify(response.data)).not.toContain('ghp_secret_1234')
      expect(JSON.stringify(response.data)).not.toContain('plain-password')
      expect(JSON.stringify(response.data)).not.toContain('sk-live-secret-abcd')
      expect(JSON.stringify(response.data)).not.toContain('version-token-8888')
      expect(response.data.env.GITHUB_TOKEN).toBe('****1234')
      expect(response.data.authConfig.password).toBe('****word')
      expect(response.data.config.apiKey).toBe('****abcd')
      expect(response.data.versions[0].config.env.VERSION_TOKEN).toBe('****8888')
    })
  })

  describe('mcp-tool marketplace.get', () => {
    it('should return marketplace presets', async () => {
      const response = await mcpToolMarketplaceHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
      expect(response.data[0]).toHaveProperty('id')
      expect(response.data[0]).toHaveProperty('name')
    })

    it('should return marketplace preset detail by slug', async () => {
      const response = await mcpMarketplaceDetailHandler(createMockEvent({
        params: { slug: 'github' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toMatchObject({
        slug: 'github',
        envSchema: expect.arrayContaining([
          expect.objectContaining({ key: 'GITHUB_TOKEN', required: true }),
        ]),
      })
    })
  })

  describe('mcp-tool install.post', () => {
    it('should return 404 when preset not found', async () => {
      const response = await mcpToolInstallHandler(
        createMockEvent({
          body: { presetId: 'nonexistent-preset' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('预设工具不存在')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should install preset tool with organization scope', async () => {
      const installed = { id: 'tool-new', name: 'GitHub MCP', status: 'active', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([installed]))

      const response = await mcpToolInstallHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { presetId: 'preset-github', env: { GITHUB_TOKEN: 'ghp_test_token' } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(installed)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should reject install when required env is missing', async () => {
      const response = await mcpToolInstallHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { presetId: 'preset-github' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toContain('GITHUB_TOKEN')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should install marketplace detail preset with required env', async () => {
      const installed = { id: 'tool-marketplace', name: 'GitHub MCP', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([installed]))

      const response = await mcpMarketplaceInstallHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { slug: 'github' },
          body: { env: { GITHUB_TOKEN: 'ghp_test_token' } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(installed)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should install all presets in a transaction when batch is valid', async () => {
      const installed = { id: 'tool-batch', name: 'GitHub MCP', organizationId: 'org-1' }
      mockTransaction.mockImplementation(async (callback: (tx: { insert: typeof mockInsert }) => unknown) =>
        callback({ insert: mockInsert }),
      )
      mockInsert.mockReturnValue(createInsertChain([installed]))

      const response = await mcpMarketplaceBatchInstallHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: [{ slug: 'github', env: { GITHUB_TOKEN: 'ghp_test_token' } }],
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toMatchObject({
        total: 1,
        success: 1,
        failed: 0,
      })
      expect(mockTransaction).toHaveBeenCalledTimes(1)
    })

    it('should rollback entire batch when any install fails', async () => {
      mockTransaction.mockImplementation(async (callback: (tx: { insert: typeof mockInsert }) => unknown) =>
        callback({ insert: mockInsert }),
      )
      mockInsert.mockReturnValue(createInsertChain([{ id: 'tool-batch', name: 'GitHub MCP' }]))

      const response = await mcpMarketplaceBatchInstallHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: [
            { slug: 'github', env: { GITHUB_TOKEN: 'ghp_test_token' } },
            { slug: 'brave-search', env: {} },
          ],
        }),
      )

      expect(response.code).not.toBe(RESPONSE_CODE.SUCCESS)
      expect(mockTransaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('mcp-tool test.post', () => {
    it('should report unhealthy when no endpoint configured', async () => {
      const response = await mcpToolTestHandler(
        createMockEvent({
          body: {},
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ healthy: false, error: 'No endpoint configured' })
    })

    it('should report tool not found when id does not exist', async () => {
      mockSelect.mockReturnValue(createToolSelectChain([]))

      const response = await mcpToolTestHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { id: 'missing' },
        }),
      )

      expect(response.data).toEqual({ healthy: false, error: 'Tool not found' })
    })

    it('should reject existing tool health check without organization context', async () => {
      const response = await mcpToolTestHandler(
        createMockEvent({
          body: { id: 'tool-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('当前账号缺少组织上下文')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should execute tools/list and return tool list when endpoint responds with success status', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ result: { tools: [{ name: 'search', description: 'Search docs' }] } }),
      })

      const response = asResponse<any>(
        await mcpToolTestHandler(
          createMockEvent({
            body: { endpoint: 'https://mcp.example.com/sse', type: 'sse' },
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.healthy).toBe(true)
      expect(response.data.status).toBe(200)
      expect(response.data.tools).toEqual([{ name: 'search', description: 'Search docs' }])
      expect(typeof response.data.latency).toBe('number')
      expect(mockFetch).toHaveBeenCalledWith(
        new URL('https://mcp.example.com/sse'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"tools/list"'),
        }),
      )
    })

    it('should update health status when testing existing tool by id', async () => {
      mockSelect.mockReturnValue(
        createToolSelectChain([
          {
            id: 'tool-1',
            type: 'sse',
            config: { endpoint: 'https://mcp.example.com/' },
          },
        ]),
      )
      mockFetch.mockResolvedValue({ status: 200, headers: { get: () => 'application/json' }, json: async () => ({ result: { tools: [] } }) })
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(
        await mcpToolTestHandler(
          createMockEvent({
            context: { principal: { organizationId: 'org-1' } },
            body: { id: 'tool-1' },
          }),
        ),
      )

      expect(response.data.healthy).toBe(true)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should report unhealthy when endpoint returns server error', async () => {
      mockFetch.mockResolvedValue({ status: 503 })

      const response = asResponse<any>(
        await mcpToolTestHandler(
          createMockEvent({
            body: { endpoint: 'https://mcp.example.com/sse' },
          }),
        ),
      )

      expect(response.data.healthy).toBe(false)
      expect(response.data.status).toBe(503)
    })
  })
})
