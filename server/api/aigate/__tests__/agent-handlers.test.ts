import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import agentDeleteHandler from '../agent/[id].delete'
import agentPutHandler from '../agent/[id].put'

import agentListHandler from '../agent/index.get'
import agentPostHandler from '../agent/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockTransaction = vi.fn()
const mockNormalizeAgentBindingInput = vi.fn()
const mockValidateAgentBindings = vi.fn()
const mockWriteAgentBindings = vi.fn()
const mockAuditLog = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    ownerId: 'ownerId',
    builtin: 'builtin',
    createdAt: 'createdAt',
  },
  insertAgentSchema: z.object({
    name: z.string(),
    organizationId: z.string().optional(),
    ownerId: z.string().optional(),
    knowledgeBases: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
  }),
}))

vi.mock('#server/utils/agent-bindings', () => ({
  normalizeAgentBindingInput: (...args: unknown[]) => mockNormalizeAgentBindingInput(...args),
  validateAgentBindings: (...args: unknown[]) => mockValidateAgentBindings(...args),
  writeAgentBindings: (...args: unknown[]) => mockWriteAgentBindings(...args),
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

function parseAgentPagination(query: Record<string, string | undefined>) {
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

describe('aigate agent handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNormalizeAgentBindingInput.mockImplementation(input => input)
    mockValidateAgentBindings.mockResolvedValue({ knowledgeBaseIds: [], toolIds: [], skillIds: [] })
    mockWriteAgentBindings.mockResolvedValue(undefined)
    mockAuditLog.mockResolvedValue(undefined)
    mockTransaction.mockImplementation(async (callback: (tx: { insert: typeof mockInsert, update: typeof mockUpdate }) => unknown) =>
      callback({ insert: mockInsert, update: mockUpdate }),
    )
  })

  describe('pure agent pagination helpers', () => {
    it('should clamp page size between 1 and 100', () => {
      expect(parseAgentPagination({ page: '0', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and page size', () => {
      expect(parseAgentPagination({ page: '3', pageSize: '10' })).toEqual({
        page: 3,
        pageSize: 10,
        offset: 20,
      })
    })
  })

  describe('agent index.post', () => {
    it('should reject invalid body missing required name', async () => {
      const response = await agentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: {},
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toContain('Invalid input')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create agent with organization scope from principal', async () => {
      const created = { id: 'agent-1', name: 'Test Agent', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await agentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Test Agent' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockWriteAgentBindings).toHaveBeenCalledTimes(1)
    })

    it('should write audit log after creating agent', async () => {
      const created = { id: 'agent-audit', name: 'Audit Agent', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { name: 'Audit Agent' },
      })
      const response = await agentPostHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'agent.create',
        { type: 'agent', id: 'agent-audit' },
        null,
        created,
      )
    })

    it('should reject non-admin create without organization context', async () => {
      const response = await agentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
          body: { name: 'Global Agent' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('Missing organization context')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject creating agent for another organization', async () => {
      const response = await agentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Other Agent', organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('Cannot create agent in another organization')
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('agent [id].put', () => {
    it('should return 404 when agent not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await agentPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
          body: { name: 'Updated' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('Agent not found')
    })

    it('should update agent scoped to organization', async () => {
      const updated = { id: 'agent-1', name: 'Renamed Bot', organizationId: 'org-1' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await agentPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'agent-1' },
          body: { name: 'Renamed Bot' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockWriteAgentBindings).toHaveBeenCalledTimes(1)
    })

    it('should write audit log with before and after when updating agent', async () => {
      const before = { id: 'agent-audit', name: 'Before Agent', organizationId: 'org-1' }
      const updated = { id: 'agent-audit', name: 'After Agent', organizationId: 'org-1' }
      mockSelect.mockReturnValue(createCountSelectChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'agent-audit' },
        body: { name: 'After Agent' },
      })
      const response = await agentPutHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'agent.update',
        { type: 'agent', id: 'agent-audit' },
        before,
        updated,
      )
    })

    it('should reject non-admin update without organization context', async () => {
      const response = await agentPutHandler(
        createMockEvent({
          params: { id: 'agent-2' },
          body: { name: 'Global Bot' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('Missing organization context')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should reject moving agent to another organization', async () => {
      const response = await agentPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'agent-1' },
          body: { organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('Cannot move agent to another organization')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should allow admin to update agent without organization context', async () => {
      const updated = { id: 'agent-2', name: 'Global Bot' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await agentPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'agent-2' },
          body: { name: 'Global Bot' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })
  })

  describe('agent index.get', () => {
    it('should return paginated agents scoped to organization', async () => {
      const items = [{ id: 'agent-1', name: 'Support Bot' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await agentListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { page: '1', pageSize: '10', keyword: 'support' },
        }),
      )

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
      const items = [{ id: 'agent-1', name: 'Bot' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await agentListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.data).toEqual(items)
    })
  })

  describe('agent [id].delete', () => {
    it('should delete agent scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'agent-1' }]))

      const response = await agentDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'agent-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
    })

    it('should write audit log when deleting agent', async () => {
      const deleted = { id: 'agent-audit', name: 'Audit Agent', organizationId: 'org-1' }
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'agent-audit' },
      })
      const response = await agentDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'agent.delete',
        { type: 'agent', id: 'agent-audit' },
        deleted,
        null,
      )
    })
  })
})
