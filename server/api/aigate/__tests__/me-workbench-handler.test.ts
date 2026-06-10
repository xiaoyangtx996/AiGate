import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import workbenchHandler from '../me/workbench.get'

import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: { id: 'id', name: 'name', tokenLimit: 'tokenLimit', tokenUsed: 'tokenUsed' },
  apiKey: {
    id: 'id',
    name: 'name',
    status: 'status',
    env: 'env',
    expiresAt: 'expiresAt',
    lastUsed: 'lastUsed',
    calls: 'calls',
    userId: 'userId',
    createdAt: 'createdAt',
  },
  apiLog: { userId: 'userId', totalTokens: 'totalTokens', cost: 'cost', createdAt: 'createdAt' },
  agent: {
    id: 'id',
    name: 'name',
    description: 'description',
    model: 'model',
    status: 'status',
    builtin: 'builtin',
    enabled: 'enabled',
    organizationId: 'organizationId',
    updatedAt: 'updatedAt',
  },
  alert: {
    id: 'id',
    title: 'title',
    message: 'message',
    type: 'type',
    severity: 'severity',
    read: 'read',
    userId: 'userId',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
  },
}))

function createWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createOrderedLimitChain(result: unknown[]) {
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

function createGroupedUsageChain(result: unknown[]) {
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

describe('aigate me workbench handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject unauthenticated requests', async () => {
    const response = await workbenchHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
  })

  it('should return current user workbench summary', async () => {
    mockSelect
      .mockReturnValueOnce(createWhereChain([{ id: 'org-1', name: 'Engineering', tokenLimit: 1000, tokenUsed: 250 }]))
      .mockReturnValueOnce(createOrderedLimitChain([{ id: 'key-1', name: 'Dev Key', status: 'active' }]))
      .mockReturnValueOnce(createGroupedUsageChain([{ date: '2026-06-09', tokens: 120, requests: 2 }]))
      .mockReturnValueOnce(createOrderedLimitChain([{ id: 'agent-1', name: 'Assistant', status: 'active' }]))
      .mockReturnValueOnce(
        createOrderedLimitChain([{ id: 'alert-1', title: 'Quota', severity: 'warning', read: false }]),
      )
      .mockReturnValueOnce(createWhereChain([{ totalTokens: 120, totalRequests: 2, totalCost: 3 }]))

    const response = await workbenchHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toMatchObject({
      profile: {
        userId: 'user-1',
        organizationId: 'org-1',
        organizationName: 'Engineering',
      },
      quota: {
        tokenLimit: 1000,
        tokenUsed: 250,
        remaining: 750,
        usagePercent: 25,
      },
      usage: {
        totalTokens: 120,
        totalRequests: 2,
        totalCost: 3,
      },
    })
    expect(mockSelect).toHaveBeenCalledTimes(6)
  })
})
