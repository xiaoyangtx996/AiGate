import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import channelGetHandler from '../channel/[id].get'

import channelPutHandler from '../channel/[id].put'
import channelStatsHandler from '../channel/[id]/stats.get'
import channelHealthCheckHandler from '../channel/health-check.post'
import channelPostHandler from '../channel/index.post'
import { asResponse, createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

const channelBodySchema = z.object({
  name: z.string(),
  vendor: z.string(),
  vendorTag: z.string(),
  endpoint: z.string(),
  organizationId: z.string().optional(),
  apiKey: z.string().optional(),
  models: z.array(z.string()).optional(),
})

vi.mock('@/db/schema', () => ({
  channel: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    vendor: 'vendor',
    vendorTag: 'vendorTag',
    endpoint: 'endpoint',
    apiKey: 'apiKey',
    models: 'models',
    health: 'health',
    updatedAt: 'updatedAt',
  },
  apiLog: {
    provider: 'provider',
    organizationId: 'organizationId',
    status: 'status',
    latency: 'latency',
    createdAt: 'createdAt',
  },
  insertChannelSchema: {
    parse: (body: unknown) => channelBodySchema.parse(body),
  },
}))

const sampleChannel = {
  id: 'ch-1',
  name: 'OpenAI Primary',
  vendor: 'openai',
  vendorTag: 'gpt-4o',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-test',
  models: ['gpt-4o'],
  organizationId: 'org-1',
  health: 'healthy',
  status: 'enabled',
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
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

function createTrendSelectChain(result: unknown[]) {
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

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function setupStatsDbMocks(
  channel: unknown | null,
  stats: { total?: number, success?: number, avg?: number, trend?: unknown[] } = {},
) {
  mockSelect
    .mockReturnValueOnce(createWhereSelectChain(channel ? [channel] : []))
    .mockReturnValueOnce(createCountWhereChain([{ count: stats.total ?? 0 }]))
    .mockReturnValueOnce(createCountWhereChain([{ count: stats.success ?? 0 }]))
    .mockReturnValueOnce(createCountWhereChain([{ avg: stats.avg ?? 0 }]))
    .mockReturnValueOnce(createTrendSelectChain(stats.trend ?? []))
}

describe('aigate channel handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('channel index.post', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelPostHandler(createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        body: {
          name: 'OpenAI Primary',
          vendor: 'openai',
          vendorTag: 'gpt-4o',
          endpoint: 'https://api.openai.com/v1/chat/completions',
        },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create channel with organization from principal', async () => {
      const created = { ...sampleChannel }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await channelPostHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-1' } },
        body: {
          name: 'OpenAI Primary',
          vendor: 'openai',
          vendorTag: 'gpt-4o',
          endpoint: 'https://api.openai.com/v1/chat/completions',
        },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should reject requests without admin principal', async () => {
      const created = { ...sampleChannel, organizationId: undefined }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await channelPostHandler(createMockEvent({
        body: {
          name: 'OpenAI Primary',
          vendor: 'openai',
          vendorTag: 'gpt-4o',
          endpoint: 'https://api.openai.com/v1/chat/completions',
        },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body missing required fields', async () => {
      const response = await channelPostHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-1' } },
        body: { name: 'Incomplete Channel' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should respect explicit organizationId in body', async () => {
      const created = { ...sampleChannel, organizationId: 'org-2' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = asResponse<any>(await channelPostHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-1' } },
        body: {
          name: 'OpenAI Primary',
          vendor: 'openai',
          vendorTag: 'gpt-4o',
          endpoint: 'https://api.openai.com/v1/chat/completions',
          organizationId: 'org-2',
        },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.organizationId).toBe('org-2')
    })
  })

  describe('channel [id].put', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelPutHandler(createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        params: { id: 'ch-1' },
        body: { name: 'Blocked Update' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should update channel successfully', async () => {
      const updated = { ...sampleChannel, name: 'OpenAI Updated' }
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      })

      const response = await channelPutHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'ch-1' },
        body: { name: 'OpenAI Updated' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })

    it('should return 404 when channel not found', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const response = await channelPutHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'missing' },
        body: { name: 'Ghost Channel' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should return 404 when channel belongs to another organization', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const response = await channelPutHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-other' } },
        params: { id: 'ch-1' },
        body: { name: 'Blocked Update' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })
  })

  describe('channel [id].get', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelGetHandler(createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return channel by id', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([sampleChannel]))

      const response = await channelGetHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(sampleChannel)
    })

    it('should return 404 when channel not found', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelGetHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should return 404 when channel is outside organization scope', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelGetHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-other' } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })
  })

  describe('channel health-check.post', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelHealthCheckHandler(createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        body: { channelId: 'ch-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return 404 when channelId not found', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelHealthCheckHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-1' } },
        body: { channelId: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在或无权访问')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should report healthy when endpoint responds ok', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([sampleChannel]))
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(await channelHealthCheckHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { channelId: 'ch-1' },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.healthy).toBe(true)
      expect(response.data.status).toBe(200)
      expect(response.data.channelId).toBe('ch-1')
      expect(typeof response.data.latency).toBe('number')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should report unhealthy when endpoint fetch fails', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([sampleChannel]))
      mockFetch.mockRejectedValue(new Error('Connection refused'))
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(await channelHealthCheckHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { channelId: 'ch-1' },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.healthy).toBe(false)
      expect(response.data.error).toBe('Connection refused')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should return summary for all channels in organization', async () => {
      const channels = [
        sampleChannel,
        { ...sampleChannel, id: 'ch-2', name: 'Anthropic Backup', endpoint: 'https://api.anthropic.com/v1/messages' },
      ]
      mockSelect.mockReturnValue(createWhereSelectChain(channels))
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: false, status: 503 })
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(await channelHealthCheckHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-1' } },
        body: {},
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.total).toBe(2)
      expect(response.data.healthy).toBe(1)
      expect(response.data.unhealthy).toBe(1)
      expect(response.data.results).toHaveLength(2)
    })

    it('should scope health check to organization channels', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelHealthCheckHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-empty' } },
        body: { channelId: 'ch-1' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在或无权访问')
    })
  })

  describe('channel [id]/stats.get', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelStatsHandler(createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return channel stats with trend data', async () => {
      setupStatsDbMocks(sampleChannel, { total: 100, success: 95, avg: 120 })

      const response = asResponse<any>(await channelStatsHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'ch-1' },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.channel).toEqual(sampleChannel)
      expect(response.data.stats.totalRequests).toBe(100)
      expect(response.data.stats.successRate).toBe('95.0%')
      expect(response.data.stats.avgLatency).toBe(120)
      expect(response.data.stats.trend).toHaveLength(24)
    })

    it('should return 404 when channel not found', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelStatsHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在')
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })

    it('should return 404 when channel is outside organization scope', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelStatsHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-other' } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在')
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })

    it('should return zero success rate when no requests recorded', async () => {
      setupStatsDbMocks(sampleChannel, { total: 0, success: 0, avg: 0 })

      const response = asResponse<any>(await channelStatsHandler(createMockEvent({
        context: { principal: { isAdmin: true, organizationId: 'org-1' } },
        params: { id: 'ch-1' },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.stats.totalRequests).toBe(0)
      expect(response.data.stats.successRate).toBe('0%')
      expect(response.data.stats.avgLatency).toBe(0)
    })
  })
})
