import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import myApiLogHandler from '../me/api-log.get'

import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiLog: {
    userId: 'userId',
    model: 'model',
    agentId: 'agentId',
    status: 'status',
    createdAt: 'createdAt',
  },
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

describe('aigate me api-log handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject unauthenticated requests', async () => {
    const response = await myApiLogHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should return paginated logs scoped to current user', async () => {
    const logs = [{ id: 'log-1', userId: 'user-1' }]
    mockSelect
      .mockReturnValueOnce(createCountSelectChain([{ total: 1 }]))
      .mockReturnValueOnce(createListSelectChain(logs))

    const response = await myApiLogHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      query: { page: '2', pageSize: '10', model: 'gpt', status: 'success' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({
      items: logs,
      total: 1,
      page: 2,
      pageSize: 10,
    })
    expect(mockSelect).toHaveBeenCalledTimes(2)
  })
})
