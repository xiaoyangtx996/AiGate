import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

const insertMcpToolBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  organizationId: z.string().optional(),
  config: z.record(z.unknown()).optional(),
  status: z.string().optional(),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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
  },
  insertMcpToolSchema: {
    parse: (body: unknown) => insertMcpToolBodySchema.parse(body),
  },
}))

import mcpToolPostHandler from '../mcp-tool/index.post'
import mcpToolPutHandler from '../mcp-tool/[id].put'
import mcpToolDeleteHandler from '../mcp-tool/[id].delete'

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate mcp-tool extended handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('mcp-tool index.post', () => {
    it('should reject invalid body missing required name', async () => {
      const response = await mcpToolPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { type: 'sse' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body with empty name', async () => {
      const response = await mcpToolPostHandler(createMockEvent({
        body: { name: '' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create tool with organization scope from principal', async () => {
      const created = {
        id: 'tool-1',
        name: 'GitHub MCP',
        type: 'sse',
        status: 'active',
        organizationId: 'org-1',
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { name: 'GitHub MCP', type: 'sse' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should preserve body organizationId when explicitly provided', async () => {
      const created = {
        id: 'tool-2',
        name: 'Shared MCP',
        organizationId: 'org-2',
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { name: 'Shared MCP', organizationId: 'org-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })

    it('should create tool without organization when principal has none', async () => {
      const created = { id: 'tool-3', name: 'Global MCP', organizationId: null }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(createMockEvent({
        body: { name: 'Global MCP' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })
  })

  describe('mcp-tool [id].put', () => {
    it('should return 404 when tool not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await mcpToolPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
        body: { name: 'Renamed MCP' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should return 404 when tool belongs to another organization', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await mcpToolPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'tool-other-org' },
        body: { name: 'Blocked Update' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update tool scoped to organization', async () => {
      const updated = {
        id: 'tool-1',
        name: 'Renamed MCP',
        status: 'inactive',
        organizationId: 'org-1',
      }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await mcpToolPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'tool-1' },
        body: { name: 'Renamed MCP', status: 'inactive' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update tool by id when principal has no organization', async () => {
      const updated = { id: 'tool-2', name: 'Global MCP', status: 'active' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await mcpToolPutHandler(createMockEvent({
        params: { id: 'tool-2' },
        body: { name: 'Global MCP' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })
  })

  describe('mcp-tool [id].delete', () => {
    it('should return 404 when tool not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await mcpToolDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete tool scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'tool-1' }]))

      const response = await mcpToolDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'tool-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete tool by id when principal has no organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'tool-2' }]))

      const response = await mcpToolDeleteHandler(createMockEvent({
        params: { id: 'tool-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })
})
