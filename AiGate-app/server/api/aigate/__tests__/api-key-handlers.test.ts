import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockInsert = vi.fn()
const mockCheckApiKeyLimit = vi.fn()
const mockGenerateApiKey = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

const apiKeyBodySchema = z.object({
  name: z.string(),
  organizationId: z.string().optional(),
  env: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  roleIds: z.array(z.string()).optional(),
})

vi.mock('@/db/schema', () => ({
  apiKey: {
    id: 'id',
    name: 'name',
    key: 'key',
    userId: 'userId',
    organizationId: 'organizationId',
  },
  insertApiKeySchema: {
    omit: () => apiKeyBodySchema,
  },
}))

vi.mock('#server/utils/api-key', () => ({
  checkApiKeyLimit: (...args: unknown[]) => mockCheckApiKeyLimit(...args),
  generateApiKey: (...args: unknown[]) => mockGenerateApiKey(...args),
}))

import apiKeyPostHandler from '../api-key/index.post'

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate api-key handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckApiKeyLimit.mockResolvedValue({ current: 0, max: 3, allowed: true })
    mockGenerateApiKey.mockReturnValue('ag-dev-0123456789abcdef0123456789abcdef')
  })

  describe('api-key index.post', () => {
    it('should return 401 when user is not logged in', async () => {
      const response = await apiKeyPostHandler(createMockEvent({ body: { name: 'Test Key' } }))

      expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
      expect(response.msg).toBe('未登录')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should return 400 when active key limit is exceeded', async () => {
      mockCheckApiKeyLimit.mockResolvedValue({ current: 3, max: 3, allowed: false })

      const response = await apiKeyPostHandler(createMockEvent({
        context: { principal: { userId: 'user-1' } },
        body: { name: 'Test Key' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toBe('每个用户最多持有 3 个活跃密钥')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body missing required name', async () => {
      const response = await apiKeyPostHandler(createMockEvent({
        context: { principal: { userId: 'user-1' } },
        body: {},
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create api key with userId and organization from principal', async () => {
      const created = {
        id: 'key-1',
        name: 'Prod Key',
        key: 'ag-dev-0123456789abcdef0123456789abcdef',
        userId: 'user-1',
        organizationId: 'org-1',
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await apiKeyPostHandler(createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { name: 'Prod Key', env: 'dev' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockCheckApiKeyLimit).toHaveBeenCalledWith('user-1')
      expect(mockGenerateApiKey).toHaveBeenCalledWith('dev')
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })
})
