import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import myApiKeyUpdateHandler from '../me/api-key/[id].put'
import myApiKeyListHandler from '../me/api-key/index.get'
import myApiKeyCreateHandler from '../me/api-key/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockCheckApiKeyLimit = vi.fn()
const mockGenerateApiKey = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
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
    createdAt: 'createdAt',
  },
}))

vi.mock('#server/utils/api-key', () => ({
  applyApiKeyDefaults: (body: unknown) => body,
  checkApiKeyLimit: (...args: unknown[]) => mockCheckApiKeyLimit(...args),
  generateApiKey: (...args: unknown[]) => mockGenerateApiKey(...args),
}))

vi.mock('#server/utils/my-api-key', () => ({
  myApiKeyCreateSchema: z.object({
    name: z.string(),
    env: z.enum(['dev', 'staging', 'prod']).default('dev'),
    scopes: z.array(z.string()).default(['read', 'write']),
    expiresAt: z.unknown().optional(),
    dailyLimit: z.number().optional().nullable(),
    ipWhitelist: z.array(z.string()).default([]),
  }),
  myApiKeyUpdateSchema: z.object({
    name: z.string().optional(),
    status: z.enum(['active', 'revoked']).optional(),
  }),
}))

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

describe('aigate me api-key handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckApiKeyLimit.mockResolvedValue({ current: 0, max: 3, allowed: true })
    mockGenerateApiKey.mockReturnValue('ag-dev-0123456789abcdef0123456789abcdef')
  })

  it('should reject unauthenticated list requests', async () => {
    const response = await myApiKeyListHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should return paginated keys scoped to current user', async () => {
    const keys = [{ id: 'key-1', userId: 'user-1' }]
    mockSelect
      .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
      .mockReturnValueOnce(createListSelectChain(keys))

    const response = await myApiKeyListHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        query: { page: '1', pageSize: '10', status: 'active' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({ items: keys, total: 1, page: 1, pageSize: 10 })
    expect(mockSelect).toHaveBeenCalledTimes(2)
  })

  it('should create a personal key for current user and organization', async () => {
    const created = { id: 'key-1', userId: 'user-1', organizationId: 'org-1' }
    mockInsert.mockReturnValue(createInsertChain([created]))

    const response = await myApiKeyCreateHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { name: 'Dev Key', env: 'dev', scopes: ['read'] },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(created)
    expect(mockCheckApiKeyLimit).toHaveBeenCalledWith('user-1')
    expect(mockGenerateApiKey).toHaveBeenCalledWith('dev')
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('should reject create when active key limit is exceeded', async () => {
    mockCheckApiKeyLimit.mockResolvedValue({ current: 3, max: 3, allowed: false })

    const response = await myApiKeyCreateHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        body: { name: 'Dev Key' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should update only a key owned by current user', async () => {
    const updated = { id: 'key-1', userId: 'user-1', status: 'revoked' }
    mockUpdate.mockReturnValue(createUpdateChain([updated]))

    const response = await myApiKeyUpdateHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        params: { id: 'key-1' },
        body: { status: 'revoked' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(updated)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('should return 404 when updating another user key', async () => {
    mockUpdate.mockReturnValue(createUpdateChain([]))

    const response = await myApiKeyUpdateHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        params: { id: 'key-2' },
        body: { status: 'revoked' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.NOT_FOUND)
  })
})
