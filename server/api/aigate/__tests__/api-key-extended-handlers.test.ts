import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import apiKeyDeleteHandler from '../api-key/[id].delete'

import apiKeyPutHandler from '../api-key/[id].put'
import { createMockEvent } from './nitro-test-utils'

const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiKey: {
    id: 'id',
    name: 'name',
    key: 'key',
    userId: 'userId',
    organizationId: 'organizationId',
  },
}))

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

describe('aigate api-key extended handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('api-key [id].put', () => {
    it('should reject non-admin principals', async () => {
      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          params: { id: 'key-1' },
          body: { name: 'Forbidden' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should return 404 when api key not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'missing' },
          body: { name: 'Renamed Key' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update api key scoped to organization', async () => {
      const updated = {
        id: 'key-1',
        name: 'Renamed Key',
        key: 'ag-dev-0123456789abcdef0123456789abcdef',
        userId: 'user-1',
        organizationId: 'org-1',
      }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'key-1' },
          body: { name: 'Renamed Key' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update api key by id when principal has no organization', async () => {
      const updated = {
        id: 'key-2',
        name: 'Global Key',
        key: 'ag-dev-fedcba9876543210fedcba9876543210',
        userId: 'user-2',
      }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'key-2' },
          body: { name: 'Global Key' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })
  })

  describe('api-key [id].delete', () => {
    it('should reject non-admin principals', async () => {
      const response = await apiKeyDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          params: { id: 'key-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should return 404 when api key not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await apiKeyDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete api key scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'key-1' }]))

      const response = await apiKeyDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'key-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete api key by id when principal has no organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'key-2' }]))

      const response = await apiKeyDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'key-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })
})
