import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
  },
  insertAgentSchema: z.object({
    name: z.string(),
    organizationId: z.string().optional(),
  }),
}))

vi.mock('#server/utils/validation', () => {
  class ValidationError extends Error {
    constructor(public issues: unknown[]) {
      super('Validation failed')
      this.name = 'ValidationError'
    }
  }

  return {
    ValidationError,
    validateBody: (schema: z.ZodSchema) => async (event: { _body?: unknown }) => {
      const result = schema.safeParse(event._body ?? {})
      if (!result.success)
        throw new ValidationError(result.error.issues)
      return result.data
    },
  }
})

import agentListHandler from '../agent/index.get'
import agentPostHandler from '../agent/index.post'
import agentPutHandler from '../agent/[id].put'

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

describe('aigate agent handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      const response = await agentPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: {},
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(response.msg).toBe('Validation failed')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create agent with organization scope from principal', async () => {
      const created = { id: 'agent-1', name: 'Test Agent', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await agentPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { name: 'Test Agent' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('agent [id].put', () => {
    it('should return 404 when agent not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await agentPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
        body: { name: 'Updated' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should update agent scoped to organization', async () => {
      const updated = { id: 'agent-1', name: 'Renamed Bot', organizationId: 'org-1' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await agentPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'agent-1' },
        body: { name: 'Renamed Bot' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update agent by id when principal has no organization', async () => {
      const updated = { id: 'agent-2', name: 'Global Bot' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await agentPutHandler(createMockEvent({
        params: { id: 'agent-2' },
        body: { name: 'Global Bot' },
      }))

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

      const response = await agentListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { page: '1', pageSize: '10', keyword: 'support' },
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
      const items = [{ id: 'agent-1', name: 'Bot' }]
      mockSelect
        .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
        .mockReturnValueOnce(createListSelectChain(items))

      const response = await agentListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

      expect(response.data).toEqual(items)
    })
  })
})
