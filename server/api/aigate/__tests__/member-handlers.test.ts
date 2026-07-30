import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import memberDeleteHandler from '../member/[id].delete'

import memberPostHandler from '../member/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockInsert = vi.fn()
const mockDelete = vi.fn()
const mockAssertTenantAccountLimit = vi.fn()
const mockAuditLog = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('#server/utils/tenant', () => ({
  assertTenantAccountLimit: (...args: unknown[]) => mockAssertTenantAccountLimit(...args),
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

const memberBodySchema = z.object({
  userId: z.string(),
  organizationId: z.string().optional(),
})

vi.mock('@/db/schema', () => ({
  member: {
    id: 'id',
    userId: 'userId',
    organizationId: 'organizationId',
  },
  insertMemberSchema: {
    parse: (body: unknown) => memberBodySchema.parse(body),
  },
}))

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
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

describe('aigate member handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertTenantAccountLimit.mockResolvedValue(undefined)
    mockAuditLog.mockResolvedValue(undefined)
  })

  describe('member index.post', () => {
    it('should reject invalid body missing userId', async () => {
      const response = await memberPostHandler(
        createMockEvent({
          body: { organizationId: 'org-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create member with principal organization when omitted', async () => {
      const created = { id: 'member-1', userId: 'user-1', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await memberPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { userId: 'user-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockAssertTenantAccountLimit).toHaveBeenCalledWith('org-1', 'user-1')
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should write audit log after creating member', async () => {
      const created = { id: 'member-audit', userId: 'user-1', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', organizationId: 'org-1' } },
        body: { userId: 'user-1' },
      })
      const response = await memberPostHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'member.create',
        { type: 'member', id: 'member-audit' },
        null,
        created,
      )
    })

    it('should reject explicit organizationId outside non-admin principal organization', async () => {
      const response = await memberPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { userId: 'user-2', organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should allow admin to create member in explicit organization', async () => {
      const created = { id: 'member-2', userId: 'user-2', organizationId: 'org-2' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await memberPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { userId: 'user-2', organizationId: 'org-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockAssertTenantAccountLimit).toHaveBeenCalledWith('org-2', 'user-2')
    })

    it('should reject member creation when tenant account limit is reached', async () => {
      mockAssertTenantAccountLimit.mockRejectedValue(
        Object.assign(new Error('Tenant account limit reached'), { statusCode: 403 }),
      )

      const response = await memberPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { userId: 'user-3' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('Tenant account limit reached')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject non-admin principals without organization context', async () => {
      const response = await memberPostHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
          body: { userId: 'user-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('member [id].delete', () => {
    it('should return 404 when member not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('成员不存在或无权操作')
    })

    it('should delete member scoped to principal organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-1' }]))

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'member-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should write audit log when deleting member', async () => {
      const deleted = { id: 'member-audit', userId: 'user-1', organizationId: 'org-1' }
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', organizationId: 'org-1' } },
        params: { id: 'member-audit' },
      })
      const response = await memberDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'member.delete',
        { type: 'member', id: 'member-audit' },
        deleted,
        null,
      )
    })

    it('should allow admin to delete member by id without organization context', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-2' }]))

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'member-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    })

    it('should return 404 when member exists in another organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'member-other-org' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('成员不存在或无权操作')
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should reject non-admin delete without organization context', async () => {
      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
          params: { id: 'member-3' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should return null data on successful delete', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-1' }]))

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'member-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
    })

    it('should return 404 when principal is scoped but member id is missing', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-2' } },
          params: { id: 'nonexistent' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('成员不存在或无权操作')
    })

    it('should return responseError when db throws', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database unavailable')),
        }),
      })

      const response = await memberDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'member-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Database unavailable')
    })
  })
})
