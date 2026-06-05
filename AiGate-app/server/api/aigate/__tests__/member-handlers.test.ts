import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockInsert = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
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

import memberPostHandler from '../member/index.post'
import memberDeleteHandler from '../member/[id].delete'

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
  })

  describe('member index.post', () => {
    it('should reject invalid body missing userId', async () => {
      const response = await memberPostHandler(createMockEvent({
        body: { organizationId: 'org-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create member with principal organization when omitted', async () => {
      const created = { id: 'member-1', userId: 'user-1', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await memberPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { userId: 'user-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should respect explicit organizationId in body', async () => {
      const created = { id: 'member-2', userId: 'user-2', organizationId: 'org-2' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await memberPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { userId: 'user-2', organizationId: 'org-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })
  })

  describe('member [id].delete', () => {
    it('should return 404 when member not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await memberDeleteHandler(createMockEvent({
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('成员不存在或无权操作')
    })

    it('should delete member scoped to principal organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-1' }]))

      const response = await memberDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'member-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete member by id when principal has no organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-2' }]))

      const response = await memberDeleteHandler(createMockEvent({
        params: { id: 'member-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    })

    it('should return 404 when member exists in another organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await memberDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'member-other-org' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('成员不存在或无权操作')
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete by id only when principal organizationId is null', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-3' }]))

      const response = await memberDeleteHandler(createMockEvent({
        context: { principal: { organizationId: null } },
        params: { id: 'member-3' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should return null data on successful delete', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'member-1' }]))

      const response = await memberDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'member-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
    })

    it('should return 404 when principal is scoped but member id is missing', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await memberDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-2' } },
        params: { id: 'nonexistent' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('成员不存在或无权操作')
    })

    it('should return responseError when db throws', async () => {
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database unavailable')),
        }),
      })

      const response = await memberDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'member-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Database unavailable')
    })
  })
})
