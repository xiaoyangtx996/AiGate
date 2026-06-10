import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCacheKey, getCached, setCached } from '#server/utils/cache'
import { RESPONSE_CODE } from '@/enums'
import gatewayHandler from '../gateway/index.get'

import { asResponse, createMockEvent } from './nitro-test-utils'

const GATEWAY_CACHE_TTL_MS = 60 * 1000

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiKey: {
    organizationId: 'organizationId',
    status: 'status',
    id: 'id',
    name: 'name',
  },
  apiLog: {
    organizationId: 'organizationId',
    createdAt: 'createdAt',
    status: 'status',
    latency: 'latency',
    id: 'id',
    model: 'model',
    totalTokens: 'totalTokens',
  },
  channel: {
    id: 'id',
    name: 'name',
    vendor: 'vendor',
    status: 'status',
    health: 'health',
    priority: 'priority',
  },
}))

function getGatewayCacheKey(orgId: string | null | undefined): string {
  return createCacheKey('gateway', orgId)
}

function computeGatewayOverview(
  keys: Array<{ status: string }>,
  channels: Array<{ status: string, health: string }>,
  recentRequestCount: number,
  recentLogs: Array<{ status: string, latency: number | null }>,
) {
  const errorCount = recentLogs.filter(l => l.status === 'error').length
  const avgLatency = recentLogs.length
    ? Math.round(recentLogs.reduce((s, l) => s + (l.latency || 0), 0) / recentLogs.length)
    : 0

  return {
    activeKeys: keys.filter(k => k.status === 'active').length,
    totalKeys: keys.length,
    activeChannels: channels.filter(c => c.status === 'enabled').length,
    healthyChannels: channels.filter(c => c.health === 'healthy').length,
    requestsLastHour: recentRequestCount,
    errorRate: recentLogs.length ? Math.round((errorCount / recentLogs.length) * 100) : 0,
    avgLatency,
  }
}

function createSimpleSelectChain(result: unknown[]) {
  return { from: vi.fn().mockResolvedValue(result) }
}

function createWhereSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createCountWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createRecentLogsChain(result: unknown[], scoped = false) {
  const limit = vi.fn().mockResolvedValue(result)
  const orderBy = vi.fn().mockReturnValue({ limit })
  if (scoped) {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ orderBy }),
      }),
    }
  }
  return { from: vi.fn().mockReturnValue({ orderBy }) }
}

function setupGatewayDbMocks(options: {
  keys?: unknown[]
  channels?: unknown[]
  recentRequests?: unknown[]
  recentLogs?: unknown[]
  scoped?: boolean
}) {
  const scoped = options.scoped ?? false
  mockSelect
    .mockReturnValueOnce(scoped
      ? createWhereSelectChain(options.keys ?? [])
      : createSimpleSelectChain(options.keys ?? []))
    .mockReturnValueOnce(createSimpleSelectChain(options.channels ?? []))
    .mockReturnValueOnce(createCountWhereChain(options.recentRequests ?? [{ count: 0 }]))
    .mockReturnValueOnce(scoped
      ? createRecentLogsChain(options.recentLogs ?? [], true)
      : createRecentLogsChain(options.recentLogs ?? [], false))
}

describe('aigate gateway handler logic', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getGatewayCacheKey', () => {
    it('should prefix gateway namespace with organization id', () => {
      expect(getGatewayCacheKey('org-abc')).toBe('gateway:org-abc')
      expect(getGatewayCacheKey(null)).toBe('gateway:null')
      expect(getGatewayCacheKey(undefined)).toBe('gateway:null')
    })

    it('should isolate cache entries per organization', () => {
      expect(getGatewayCacheKey('org-1')).not.toBe(getGatewayCacheKey('org-2'))
    })
  })

  describe('gateway cache ttl', () => {
    it('should serve cached gateway payload within 60s TTL', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = getGatewayCacheKey('org-1')
      const payload = { overview: { activeKeys: 2 } }

      setCached(key, payload, GATEWAY_CACHE_TTL_MS)
      expect(getCached(key)).toEqual(payload)
    })

    it('should evict gateway cache after TTL expires', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      const key = getGatewayCacheKey('org-1')
      setCached(key, { overview: { activeKeys: 1 } }, GATEWAY_CACHE_TTL_MS)

      vi.advanceTimersByTime(GATEWAY_CACHE_TTL_MS + 1)
      expect(getCached(key)).toBeNull()
    })

    it('should isolate cache entries per organization key', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T10:00:00Z'))

      setCached(getGatewayCacheKey('org-1'), { org: 1 }, GATEWAY_CACHE_TTL_MS)
      setCached(getGatewayCacheKey('org-2'), { org: 2 }, GATEWAY_CACHE_TTL_MS)

      expect(getCached(getGatewayCacheKey('org-1'))).toEqual({ org: 1 })
      expect(getCached(getGatewayCacheKey('org-2'))).toEqual({ org: 2 })
    })
  })

  describe('computeGatewayOverview', () => {
    it('should aggregate keys, channels, and recent log metrics', () => {
      const overview = computeGatewayOverview(
        [{ status: 'active' }, { status: 'active' }, { status: 'revoked' }],
        [
          { status: 'enabled', health: 'healthy' },
          { status: 'enabled', health: 'unhealthy' },
          { status: 'disabled', health: 'healthy' },
        ],
        42,
        [
          { status: 'success', latency: 100 },
          { status: 'error', latency: 200 },
          { status: 'success', latency: 300 },
        ],
      )

      expect(overview).toEqual({
        activeKeys: 2,
        totalKeys: 3,
        activeChannels: 2,
        healthyChannels: 2,
        requestsLastHour: 42,
        errorRate: 33,
        avgLatency: 200,
      })
    })

    it('should return zero metrics when there are no recent logs', () => {
      expect(computeGatewayOverview([], [], 0, [])).toEqual({
        activeKeys: 0,
        totalKeys: 0,
        activeChannels: 0,
        healthyChannels: 0,
        requestsLastHour: 0,
        errorRate: 0,
        avgLatency: 0,
      })
    })
  })
})

describe('aigate gateway index.get', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should aggregate gateway overview and channel list', async () => {
    setupGatewayDbMocks({
      scoped: true,
      keys: [
        { id: 'key-1', status: 'active', name: 'Primary' },
        { id: 'key-2', status: 'revoked', name: 'Old' },
      ],
      channels: [{
        id: 'ch-1',
        name: 'OpenAI',
        vendor: 'openai',
        status: 'enabled',
        health: 'healthy',
        priority: 1,
      }],
      recentRequests: [{ count: 15 }],
      recentLogs: [
        { id: 'log-1', model: 'gpt-4', status: 'success', latency: 100, totalTokens: 50, createdAt: new Date() },
        { id: 'log-2', model: 'gpt-4', status: 'error', latency: 300, totalTokens: 0, createdAt: new Date() },
      ],
    })

    const response = await gatewayHandler(createMockEvent({
      context: { principal: { organizationId: 'org-1' } },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toMatchObject({
      overview: {
        activeKeys: 1,
        totalKeys: 2,
        activeChannels: 1,
        healthyChannels: 1,
        requestsLastHour: 15,
        errorRate: 50,
        avgLatency: 200,
      },
      channels: [{
        id: 'ch-1',
        name: 'OpenAI',
        vendor: 'openai',
        status: 'enabled',
        health: 'healthy',
        priority: 1,
      }],
      recentLogs: [
        expect.objectContaining({ id: 'log-1', status: 'success', latency: 100 }),
        expect.objectContaining({ id: 'log-2', status: 'error', latency: 300 }),
      ],
    })
    expect(mockSelect).toHaveBeenCalledTimes(4)
  })

  it('should return cached gateway payload on repeated requests', async () => {
    setupGatewayDbMocks({
      scoped: true,
      keys: [{ id: 'key-1', status: 'active' }],
      channels: [],
      recentRequests: [{ count: 3 }],
      recentLogs: [],
    })

    const event = createMockEvent({ context: { principal: { organizationId: 'org-cache-test' } } })
    const first = await gatewayHandler(event)
    const second = await gatewayHandler(event)

    expect(first.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(second.data).toEqual(first.data)
    expect(mockSelect).toHaveBeenCalledTimes(4)
  })

  it('should use separate cache entries per organization', async () => {
    setupGatewayDbMocks({
      scoped: true,
      keys: [{ id: 'key-a', status: 'active' }],
      channels: [],
      recentRequests: [{ count: 1 }],
      recentLogs: [],
    })
    setupGatewayDbMocks({
      scoped: true,
      keys: [{ id: 'key-b', status: 'active' }],
      channels: [],
      recentRequests: [{ count: 2 }],
      recentLogs: [],
    })

    const org1 = asResponse<any>(await gatewayHandler(createMockEvent({
      context: { principal: { organizationId: 'org-split-a' } },
    })))
    const org2 = asResponse<any>(await gatewayHandler(createMockEvent({
      context: { principal: { organizationId: 'org-split-b' } },
    })))

    expect(org1.data?.overview.requestsLastHour).toBe(1)
    expect(org2.data?.overview.requestsLastHour).toBe(2)
    expect(mockSelect).toHaveBeenCalledTimes(8)
  })
})
