import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import mcpToolDeleteHandler from '../mcp-tool/[id].delete'

import mcpToolPutHandler from '../mcp-tool/[id].put'
import mcpToolPostHandler from '../mcp-tool/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockAuditLog = vi.fn()

const insertMcpToolBodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  transportType: z.string().optional(),
  command: z.string().optional().nullable(),
  args: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
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

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
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
    mockAuditLog.mockResolvedValue(undefined)
  })

  describe('mcp-tool index.post', () => {
    it('should reject invalid body missing required name', async () => {
      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { type: 'sse' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body with empty name', async () => {
      const response = await mcpToolPostHandler(
        createMockEvent({
          body: { name: '' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
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

      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'GitHub MCP', type: 'sse' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should reject creating tool for another organization', async () => {
      const created = {
        id: 'tool-2',
        name: 'Shared MCP',
        organizationId: 'org-2',
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Shared MCP', organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('无权向其他组织创建 MCP 工具')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should allow admin to create tool with explicit organizationId', async () => {
      const created = {
        id: 'tool-2',
        name: 'Shared MCP',
        organizationId: 'org-2',
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { name: 'Shared MCP', organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })

    it('should write audit log after creating tool', async () => {
      const created = { id: 'tool-audit', name: 'Audit MCP', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { name: 'Audit MCP' },
      })
      const response = await mcpToolPostHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'mcp_tool.create',
        { type: 'mcp_tool', id: 'tool-audit' },
        null,
        created,
      )
    })

    it('should reject non-admin create without organization context', async () => {
      const created = { id: 'tool-3', name: 'Global MCP', organizationId: null }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(
        createMockEvent({
          body: { name: 'Global MCP' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('当前账号缺少组织上下文')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should allow admin to create tool without organization context', async () => {
      const created = { id: 'tool-3', name: 'Global MCP', organizationId: null }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { name: 'Global MCP' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })

    it('should redact secret values from create response', async () => {
      const created = {
        id: 'tool-secret',
        name: 'Secret MCP',
        organizationId: 'org-1',
        env: { GITHUB_TOKEN: 'ghp_secret_1234' },
        authConfig: { token: 'bearer-secret-5678' },
        config: { env: { API_TOKEN: 'nested-secret-9999' } },
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Secret MCP', type: 'sse' },
        }),
      )

      expect(JSON.stringify(response.data)).not.toContain('ghp_secret_1234')
      expect(JSON.stringify(response.data)).not.toContain('bearer-secret-5678')
      expect(JSON.stringify(response.data)).not.toContain('nested-secret-9999')
      expect((response.data as any).env.GITHUB_TOKEN).toBe('****1234')
      expect((response.data as any).authConfig.token).toBe('****5678')
      expect((response.data as any).config.env.API_TOKEN).toBe('****9999')
    })

    it('should reject stdio command outside allowlist', async () => {
      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Unsafe MCP', transportType: 'stdio', command: 'bash', args: ['-lc', 'id'] },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toBe('MCP stdio command 不在白名单内')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject stdio args with shell metacharacters', async () => {
      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Unsafe MCP', transportType: 'stdio', command: 'npx', args: ['ok', '; rm -rf /'] },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toContain('MCP stdio args 包含不安全字符')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should allow stdio commands in allowlist', async () => {
      const created = { id: 'tool-stdio', name: 'Safe MCP', transportType: 'stdio', command: 'npx', args: ['@scope/pkg'] }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await mcpToolPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Safe MCP', transportType: 'stdio', command: 'npx', args: ['@scope/pkg'] },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockInsert.mock.results[0]?.value.values).toHaveBeenCalledWith(expect.objectContaining({
        command: 'npx',
        args: ['@scope/pkg'],
      }))
    })
  })

  describe('mcp-tool [id].put', () => {
    it('should return 404 when tool not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
          body: { name: 'Renamed MCP' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should return 404 when tool belongs to another organization', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'tool-other-org' },
          body: { name: 'Blocked Update' },
        }),
      )

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

      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'tool-1' },
          body: { name: 'Renamed MCP', status: 'inactive' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should reject non-admin update without organization context', async () => {
      const updated = { id: 'tool-2', name: 'Global MCP', status: 'active' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await mcpToolPutHandler(
        createMockEvent({
          params: { id: 'tool-2' },
          body: { name: 'Global MCP' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('当前账号缺少组织上下文')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should reject moving tool to another organization', async () => {
      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'tool-1' },
          body: { organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('无权转移 MCP 工具到其他组织')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should reject unsafe stdio args on update', async () => {
      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'tool-1' },
          body: { transportType: 'stdio', command: 'npx', args: ['--yes', '`whoami`'] },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toContain('MCP stdio args 包含不安全字符')
    })

    it('should allow admin to update tool without organization context', async () => {
      const updated = { id: 'tool-2', name: 'Global MCP', status: 'active' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'tool-2' },
          body: { name: 'Global MCP' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })

    it('should write audit log with before and after when updating tool', async () => {
      const before = { id: 'tool-audit', name: 'Before MCP', organizationId: 'org-1' }
      const updated = { id: 'tool-audit', name: 'After MCP', organizationId: 'org-1' }
      mockSelect.mockReturnValue(createSelectChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'tool-audit' },
        body: { name: 'After MCP' },
      })
      const response = await mcpToolPutHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'mcp_tool.update',
        { type: 'mcp_tool', id: 'tool-audit' },
        before,
        updated,
      )
    })

    it('should redact secret values from update response', async () => {
      const updated = {
        id: 'tool-secret',
        name: 'Secret MCP',
        status: 'active',
        env: { GITHUB_TOKEN: 'ghp_secret_1234' },
        authConfig: { password: 'plain-password' },
        config: { headers: { Authorization: 'Bearer header-secret-0000' } },
      }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await mcpToolPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'tool-secret' },
          body: { name: 'Secret MCP' },
        }),
      )

      expect(JSON.stringify(response.data)).not.toContain('ghp_secret_1234')
      expect(JSON.stringify(response.data)).not.toContain('plain-password')
      expect(JSON.stringify(response.data)).not.toContain('header-secret-0000')
      expect((response.data as any).env.GITHUB_TOKEN).toBe('****1234')
      expect((response.data as any).authConfig.password).toBe('****word')
      expect((response.data as any).config.headers.Authorization).toBe('****0000')
    })
  })

  describe('mcp-tool [id].delete', () => {
    it('should return 404 when tool not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await mcpToolDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete tool scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'tool-1' }]))

      const response = await mcpToolDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'tool-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should reject non-admin delete without organization context', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'tool-2' }]))

      const response = await mcpToolDeleteHandler(
        createMockEvent({
          params: { id: 'tool-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('当前账号缺少组织上下文')
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should allow admin to delete tool without organization context', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'tool-2' }]))

      const response = await mcpToolDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'tool-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should write audit log when deleting tool', async () => {
      const deleted = { id: 'tool-audit', name: 'Audit MCP', organizationId: 'org-1' }
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'tool-audit' },
      })
      const response = await mcpToolDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'mcp_tool.delete',
        { type: 'mcp_tool', id: 'tool-audit' },
        deleted,
        null,
      )
    })
  })
})
