import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import apiKeyDeleteHandler from '../api-key/[id].delete'
import apiKeyGetHandler from '../api-key/[id].get'
import apiKeyPutHandler from '../api-key/[id].put'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockAuditLog = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
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
    status: 'status',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt',
  },
  apiLog: {
    apiKeyId: 'apiKeyId',
    createdAt: 'createdAt',
    model: 'model',
    totalTokens: 'totalTokens',
    cost: 'cost',
  },
  logs: {
    action: 'action',
    userId: 'userId',
    targetType: 'targetType',
    targetId: 'targetId',
    createdAt: 'createdAt',
  },
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUsageSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

function createTopModelsSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

function createAuditSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
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

describe('aigate api-key extended handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('api-key [id].get', () => {
    it('should reject non-admin principals', async () => {
      const response = await apiKeyGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          params: { id: 'key-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return key detail with usage, top models and lifecycle', async () => {
      const record = {
        id: 'key-1',
        name: 'Prod Key',
        userId: 'user-1',
        organizationId: 'org-1',
        createdAt: new Date('2026-06-01T00:00:00Z'),
      }
      const usage30d = [{ date: '2026-06-10', calls: 6, tokens: 1200, cost: 15 }]
      const topModels = [{ model: 'gpt-4o', calls: 5, tokens: 1000, cost: 12 }]
      const auditRows = [{ action: 'api_key.disable', userId: 'admin-1', createdAt: new Date('2026-06-10T01:00:00Z') }]
      mockSelect
        .mockReturnValueOnce(createSelectChain([record]))
        .mockReturnValueOnce(createUsageSelectChain(usage30d))
        .mockReturnValueOnce(createTopModelsSelectChain(topModels))
        .mockReturnValueOnce(createAuditSelectChain(auditRows))

      const response = await apiKeyGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'key-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        ...record,
        usage30d,
        topModels,
        lifecycle: [
          { action: 'api_key.create', createdAt: record.createdAt, userId: 'user-1' },
          ...auditRows,
        ],
      })
    })

    it('should return 404 when detail is not found', async () => {
      mockSelect.mockReturnValueOnce(createSelectChain([]))

      const response = await apiKeyGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })
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
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'missing' },
          body: { name: 'Renamed Key' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should update api key scoped to organization', async () => {
      const before = {
        id: 'key-1',
        name: 'Prod Key',
        key: 'ag-dev-0123456789abcdef0123456789abcdef',
        userId: 'user-1',
        organizationId: 'org-1',
      }
      const updated = { ...before, name: 'Renamed Key' }
      mockSelect.mockReturnValue(createSelectChain([before]))
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
      expect(mockAuditLog).toHaveBeenCalledWith(expect.anything(), 'api_key.update', expect.anything(), before, updated)
    })

    it('should update api key by id when principal has no organization', async () => {
      const before = { id: 'key-2', name: 'Global Key', userId: 'user-2' }
      const updated = { ...before, name: 'Global Key 2' }
      mockSelect.mockReturnValue(createSelectChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'key-2' },
          body: { name: 'Global Key 2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })

    it('should apply disable lifecycle action', async () => {
      const updated = { id: 'key-1', status: 'disabled' }
      mockSelect.mockReturnValue(createSelectChain([{ id: 'key-1', status: 'active' }]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'key-1' },
          body: { action: 'disable' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.anything(),
        'api_key.disable',
        expect.anything(),
        expect.objectContaining({ status: 'active' }),
        updated,
      )
    })

    it('should reject unsupported update fields', async () => {
      const response = await apiKeyPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          params: { id: 'key-1' },
          body: { key: 'ag-prod-unsafe' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockUpdate).not.toHaveBeenCalled()
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
