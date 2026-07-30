import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pickBotTool, queryAgentsStats, queryAlerts, queryApiKeys, queryChannelsHealth, queryQuota, queryTokenUsage } from '../aigate-bot'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    status: 'status',
    enabled: 'enabled',
  },
  alert: {
    id: 'id',
    organizationId: 'organizationId',
    type: 'type',
    severity: 'severity',
    title: 'title',
    read: 'read',
    status: 'status',
  },
  apiKey: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    status: 'status',
    expiresAt: 'expiresAt',
  },
  apiLog: {
    agentId: 'agentId',
    organizationId: 'organizationId',
    userId: 'userId',
    model: 'model',
    totalTokens: 'totalTokens',
    cost: 'cost',
    createdAt: 'createdAt',
    type: 'type',
    status: 'status',
  },
  channel: {
    id: 'id',
    name: 'name',
    status: 'status',
    health: 'health',
  },
  channelCredential: {
    channelId: 'channelId',
    status: 'status',
  },
  conversation: {
    agentId: 'agentId',
  },
  organization: {
    id: 'id',
    name: 'name',
    tokenLimit: 'tokenLimit',
    tokenUsed: 'tokenUsed',
  },
}))

function createCountOnlyChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createFromOnlyCountChain(result: unknown[]) {
  return {
    from: vi.fn().mockResolvedValue(result),
  }
}

function createGroupedLimitChain(result: unknown[]) {
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

function createWhereLimitChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createFromOnlyChain(result: unknown[]) {
  return {
    from: vi.fn().mockResolvedValue(result),
  }
}

function createWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createGroupedChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('aigate bot tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should include user dimension in token usage rows', async () => {
    mockSelect.mockReturnValue(
      createGroupedLimitChain([
        { organizationId: 'org-1', userId: 'user-1', model: 'gpt-4o', tokens: 120, requests: 3, cost: 0 },
      ]),
    )

    const result = await queryTokenUsage({ isAdmin: true }, { days: 7, limit: 3 })

    expect(result.rows).toEqual([
      { organizationId: 'org-1', userId: 'user-1', model: 'gpt-4o', tokens: 120, requests: 3, cost: 0 },
    ])
  })

  it('should reject token usage windows above 90 days', async () => {
    await expect(queryTokenUsage({ isAdmin: true }, { days: 365 })).rejects.toThrow()
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should reject token usage limits above 20', async () => {
    await expect(queryTokenUsage({ isAdmin: true }, { limit: 50 })).rejects.toThrow()
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should not expose global data when tenant user has no organization context', async () => {
    mockSelect
      .mockReturnValueOnce(createCountOnlyChain([{ count: 3 }]))
      .mockReturnValueOnce(createFromOnlyCountChain([{ count: 3 }]))
      .mockReturnValueOnce(createCountOnlyChain([{ count: 3 }]))

    expect(await queryTokenUsage({ isAdmin: false })).toEqual({
      restricted: true,
      visibleCount: 0,
      globalCount: 3,
      rows: [],
    })
    expect(await queryApiKeys({ isAdmin: false })).toEqual({
      restricted: true,
      visibleCount: 0,
      globalCount: 3,
      total: 0,
      active: 0,
      disabled: 0,
      revoked: 0,
      abnormal: 0,
      expiringSoon: 0,
      rows: [],
    })
    expect(await queryAlerts({ isAdmin: false })).toEqual({
      restricted: true,
      visibleCount: 0,
      globalCount: 3,
      open: 0,
      unread: 0,
      byType: {},
      byStatus: {},
      rows: [],
    })
    expect(await queryQuota({ isAdmin: false })).toEqual({ restricted: true, rows: [] })
    expect(await queryAgentsStats({ isAdmin: false })).toEqual({
      restricted: true,
      visibleCount: 0,
      globalCount: 0,
      total: 0,
      active: 0,
      rows: [],
    })
    expect(mockSelect).toHaveBeenCalled()
  })

  it('should include quota exhaustion estimate', async () => {
    mockSelect
      .mockReturnValueOnce(createWhereLimitChain([{ id: 'org-1', name: 'Team', tokenLimit: 1000, tokenUsed: 650 }]))
      .mockReturnValueOnce(createGroupedChain([{ organizationId: 'org-1', tokens: 700 }]))

    const result = await queryQuota({ isAdmin: false, organizationId: 'org-1' })

    expect(result.rows[0]).toMatchObject({
      id: 'org-1',
      usedPercentage: 65,
      estimatedDaysRemaining: 4,
    })
  })

  it('should count disabled and abnormal api keys', async () => {
    mockSelect
      .mockReturnValueOnce(createWhereLimitChain([
        { id: 'key-1', name: 'Active', status: 'active', expiresAt: null },
        { id: 'key-2', name: 'Disabled', status: 'disabled', expiresAt: null },
        { id: 'key-3', name: 'Revoked', status: 'revoked', expiresAt: null },
      ]))
      .mockReturnValueOnce(createCountOnlyChain([{ count: 3 }]))

    const result = await queryApiKeys({ isAdmin: true })

    expect(result).toMatchObject({
      total: 3,
      active: 1,
      disabled: 1,
      revoked: 1,
      abnormal: 2,
    })
  })

  it('should not scope admin alert queries to active organization', async () => {
    const where = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([
        { id: 'alert-1', type: 'quota_warning', severity: 'warning', title: 'Quota', read: false, status: 'open' },
      ]),
    })
    mockSelect
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where }) })
      .mockReturnValueOnce(createCountOnlyChain([{ count: 1 }]))

    const result = await queryAlerts({ isAdmin: true, organizationId: 'org-1' })

    expect(where).toHaveBeenCalledTimes(1)
    expect(result.open).toBe(1)
    expect(result.byStatus.open).toBe(1)
  })

  it('should use all organizations for admin quota usage estimates', async () => {
    const usageWhere = vi.fn().mockReturnValue({
      groupBy: vi.fn().mockResolvedValue([{ organizationId: 'org-2', tokens: 700 }]),
    })
    mockSelect
      .mockReturnValueOnce(createWhereLimitChain([{ id: 'org-2', name: 'Team 2', tokenLimit: 1000, tokenUsed: 650 }]))
      .mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: usageWhere }) })

    const result = await queryQuota({ isAdmin: true, organizationId: 'org-1' })

    expect(usageWhere).toHaveBeenCalledWith(expect.anything())
    expect(result.rows[0]).toMatchObject({
      id: 'org-2',
      estimatedDaysRemaining: 4,
    })
  })

  it('should include credential health stats for admin channel health queries', async () => {
    mockSelect
      .mockReturnValueOnce(createFromOnlyChain([{ id: 'ch-1', name: 'OpenAI', status: 'enabled', health: 'healthy' }]))
      .mockReturnValueOnce(createWhereChain([
        { channelId: 'ch-1', status: 'active' },
        { channelId: 'ch-1', status: 'exhausted' },
        { channelId: 'ch-1', status: 'error' },
      ]))

    const result = await queryChannelsHealth({ isAdmin: true })

    expect(result.rows[0]).toMatchObject({
      id: 'ch-1',
      credentials: { total: 3, active: 1, exhausted: 1, error: 1 },
    })
  })

  it('should include agent conversation and error counts', async () => {
    mockSelect
      .mockReturnValueOnce(createWhereLimitChain([{ id: 'agent-1', name: 'Support', status: 'active', enabled: true }]))
      .mockReturnValueOnce(createGroupedChain([{ agentId: 'agent-1', conversations: 8 }]))
      .mockReturnValueOnce(createGroupedChain([{ agentId: 'agent-1', errors: 2 }]))

    const result = await queryAgentsStats({ isAdmin: true })

    expect(result).toMatchObject({
      total: 1,
      active: 1,
      rows: [{ id: 'agent-1', name: 'Support', conversations: 8, errors: 2 }],
    })
  })

  it('should route questions to the expected tool', () => {
    expect(pickBotTool('channel health')).toBe('query_channels_health')
    expect(pickBotTool('quota status')).toBe('query_quota')
    expect(pickBotTool('api key expiry')).toBe('query_api_keys')
  })
})
