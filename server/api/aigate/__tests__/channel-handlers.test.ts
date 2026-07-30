import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import channelGetHandler from '../channel/[id].get'

import channelDeleteHandler from '../channel/[id].delete'
import channelPutHandler from '../channel/[id].put'
import credentialDeleteHandler from '../channel/[id]/credentials/[credentialId].delete'
import credentialPutHandler from '../channel/[id]/credentials/[credentialId].put'
import credentialPostHandler from '../channel/[id]/credentials/index.post'
import channelStatsHandler from '../channel/[id]/stats.get'
import channelHealthCheckHandler from '../channel/health-check.post'
import channelPostHandler from '../channel/index.post'
import { asResponse, createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockTransaction = vi.fn()
const mockFetch = vi.fn()
const mockAuditLog = vi.fn()

vi.stubGlobal('fetch', mockFetch)

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
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
const channelUpdateSchema = channelBodySchema.partial()
const credentialBodySchema = z.object({
  channelId: z.string(),
  name: z.string(),
  apiKey: z.string(),
  status: z.string().optional(),
  sort: z.number().optional(),
})
const credentialUpdateSchema = credentialBodySchema.omit({ channelId: true }).partial()

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
  channelCredential: {
    id: 'id',
    channelId: 'channelId',
    name: 'name',
    apiKey: 'apiKey',
    status: 'status',
    sort: 'sort',
    cooldownUntil: 'cooldownUntil',
    lastCheckedAt: 'lastCheckedAt',
    lastError: 'lastError',
    createdAt: 'createdAt',
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
  updateChannelSchema: {
    parse: (body: unknown) => channelUpdateSchema.parse(body),
  },
  insertChannelCredentialSchema: {
    parse: (body: unknown) => credentialBodySchema.parse(body),
  },
  updateChannelCredentialSchema: {
    parse: (body: unknown) => credentialUpdateSchema.parse(body),
  },
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

vi.mock('#server/utils/credential-crypto', () => ({
  encryptCredential: (value: string) => `enc:${value}`,
  decryptCredentialIfNeeded: (value: string) => value.replace(/^enc:/, ''),
}))

vi.mock('#server/utils/gateway-channel', async importOriginal => ({
  ...(await importOriginal<typeof import('#server/utils/gateway-channel')>()),
  toPublicCredential: (item: { apiKey: string }) => ({
    ...item,
    apiKey: undefined,
    apiKeyMasked: `****${item.apiKey.replace(/^enc:/, '').slice(-4)}`,
  }),
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

const sampleCredential = {
  id: 'cred-1',
  channelId: 'ch-1',
  name: 'Primary',
  apiKey: 'sk-test',
  status: 'active',
  sort: 0,
  cooldownUntil: null,
  lastCheckedAt: null,
  lastError: null,
  createdAt: new Date(),
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

function createDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
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
    mockAuditLog.mockResolvedValue(undefined)
    mockTransaction.mockImplementation(async (callback: any) => callback({
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
    }))
  })

  describe('channel credentials', () => {
    it('should create credential with masked response and audit log', async () => {
      const created = { ...sampleCredential, id: 'cred-audit', apiKey: 'sk-created' }
      mockSelect.mockReturnValue(createWhereSelectChain([{ id: 'ch-1' }]))
      mockInsert.mockReturnValue(createInsertChain([created]))

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'ch-1' },
        body: { name: 'Primary', apiKey: 'sk-created' },
      })
      const response = asResponse<any>(await credentialPostHandler(event))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.apiKey).toBeUndefined()
      expect(response.data.apiKeyMasked).toBe('****ated')
      expect(mockInsert.mock.results[0]?.value.values).toHaveBeenCalledWith(expect.objectContaining({
        apiKey: 'enc:sk-created',
      }))
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'channel_credential.create',
        { type: 'channel_credential', id: 'cred-audit' },
        null,
        created,
      )
    })

    it('should update credential with before and after audit log', async () => {
      const before = { ...sampleCredential, id: 'cred-audit', apiKey: 'sk-before' }
      const updated = { ...sampleCredential, id: 'cred-audit', name: 'Updated', apiKey: 'sk-after' }
      mockSelect.mockReturnValue(createWhereSelectChain([before]))
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      })

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'ch-1', credentialId: 'cred-audit' },
        body: { name: 'Updated' },
      })
      const response = asResponse<any>(await credentialPutHandler(event))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.apiKey).toBeUndefined()
      expect(response.data.apiKeyMasked).toBe('****fter')
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'channel_credential.update',
        { type: 'channel_credential', id: 'cred-audit' },
        before,
        updated,
      )
    })

    it('should delete credential with audit log', async () => {
      const deleted = { ...sampleCredential, id: 'cred-audit', apiKey: 'sk-deleted' }
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'ch-1', credentialId: 'cred-audit' },
      })
      const response = await credentialDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'channel_credential.delete',
        { type: 'channel_credential', id: 'cred-audit' },
        deleted,
        null,
      )
    })
  })

  describe('channel index.post', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          body: {
            name: 'OpenAI Primary',
            vendor: 'openai',
            vendorTag: 'gpt-4o',
            endpoint: 'https://api.openai.com/v1/chat/completions',
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create channel with organization from principal', async () => {
      const created = { ...sampleChannel }
      const channelInsert = createInsertChain([created])
      mockInsert.mockReturnValue(channelInsert)

      const response = await channelPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          body: {
            name: 'OpenAI Primary',
            vendor: 'openai',
            vendorTag: 'gpt-4o',
            endpoint: 'https://api.openai.com/v1/chat/completions',
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(channelInsert.values).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: expect.anything() }))
    })

    it('should reject requests without admin principal', async () => {
      const created = { ...sampleChannel, organizationId: undefined }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await channelPostHandler(
        createMockEvent({
          body: {
            name: 'OpenAI Primary',
            vendor: 'openai',
            vendorTag: 'gpt-4o',
            endpoint: 'https://api.openai.com/v1/chat/completions',
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body missing required fields', async () => {
      const response = await channelPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          body: { name: 'Incomplete Channel' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should respect explicit organizationId in body', async () => {
      const created = { ...sampleChannel, organizationId: 'org-2' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = asResponse<any>(
        await channelPostHandler(
          createMockEvent({
            context: { principal: { isAdmin: true, organizationId: 'org-1' } },
            body: {
              name: 'OpenAI Primary',
              vendor: 'openai',
              vendorTag: 'gpt-4o',
              endpoint: 'https://api.openai.com/v1/chat/completions',
              organizationId: 'org-2',
            },
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.organizationId).toBe('org-2')
    })

    it('should store initial apiKey only as a channel credential', async () => {
      const created = { ...sampleChannel, apiKey: null }
      const channelInsert = createInsertChain([created])
      const credentialInsert = createInsertChain([{ id: 'cred-1' }])
      mockInsert.mockReturnValueOnce(channelInsert).mockReturnValueOnce(credentialInsert)

      const response = await channelPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          body: {
            name: 'OpenAI Primary',
            vendor: 'openai',
            vendorTag: 'gpt-4o',
            endpoint: 'https://api.openai.com/v1/chat/completions',
            apiKey: 'sk-created',
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(channelInsert.values).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: expect.anything() }))
      expect(credentialInsert.values).toHaveBeenCalledWith(expect.objectContaining({
        channelId: 'ch-1',
        apiKey: 'enc:sk-created',
      }))
    })
  })

  describe('channel [id].put', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          params: { id: 'ch-1' },
          body: { name: 'Blocked Update' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should update channel successfully', async () => {
      const updated = { ...sampleChannel, name: 'OpenAI Updated' }
      mockSelect.mockReturnValue(createWhereSelectChain([sampleChannel]))
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updated]),
          }),
        }),
      })

      const response = await channelPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'ch-1' },
          body: { name: 'OpenAI Updated' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })

    it('should not write apiKey updates to the channel table', async () => {
      const updated = { ...sampleChannel, name: 'OpenAI Updated' }
      const set = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      })
      mockSelect.mockReturnValue(createWhereSelectChain([sampleChannel]))
      mockUpdate.mockReturnValue({ set })

      const response = await channelPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'ch-1' },
          body: { name: 'OpenAI Updated', apiKey: 'sk-ignored' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(set).toHaveBeenCalledWith({ name: 'OpenAI Updated' })
    })

    it('should return 404 when channel not found', async () => {
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      const response = await channelPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'missing' },
          body: { name: 'Ghost Channel' },
        }),
      )

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

      const response = await channelPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-other' } },
          params: { id: 'ch-1' },
          body: { name: 'Blocked Update' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })
  })

  describe('channel [id].get', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          params: { id: 'ch-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return channel by id', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([sampleChannel]))

      const response = await channelGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'ch-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ ...sampleChannel, apiKey: undefined })
    })

    it('should return 404 when channel not found', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should return 404 when channel is outside organization scope', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelGetHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-other' } },
          params: { id: 'ch-1' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })
  })

  describe('channel health-check.post', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelHealthCheckHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          body: { channelId: 'ch-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return 404 when channelId not found', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelHealthCheckHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-1' } },
          body: { channelId: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在或无权访问')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should report healthy when endpoint responds ok', async () => {
      mockSelect
        .mockReturnValueOnce(createWhereSelectChain([sampleChannel]))
        .mockReturnValueOnce(createWhereSelectChain([sampleCredential]))
        .mockReturnValueOnce(createWhereSelectChain([sampleCredential]))
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify({ data: [{ id: 'gpt-4o' }] })),
      })
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(
        await channelHealthCheckHandler(
          createMockEvent({
            context: { principal: { isAdmin: true } },
            body: { channelId: 'ch-1' },
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.healthy).toBe(true)
      expect(response.data.status).toBe(200)
      expect(response.data.channelId).toBe('ch-1')
      expect(typeof response.data.latency).toBe('number')
      expect(mockUpdate).toHaveBeenCalledTimes(2)
    })

    it('should report unhealthy when endpoint fetch fails', async () => {
      mockSelect
        .mockReturnValueOnce(createWhereSelectChain([sampleChannel]))
        .mockReturnValueOnce(createWhereSelectChain([sampleCredential]))
        .mockReturnValueOnce(createWhereSelectChain([{ ...sampleCredential, status: 'error' }]))
      mockFetch.mockRejectedValue(new Error('Connection refused'))
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(
        await channelHealthCheckHandler(
          createMockEvent({
            context: { principal: { isAdmin: true } },
            body: { channelId: 'ch-1' },
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.healthy).toBe(false)
      expect(response.data.error).toBe('Connection refused')
      expect(mockUpdate).toHaveBeenCalledTimes(2)
    })

    it('should return summary for all channels in organization', async () => {
      const channels = [
        sampleChannel,
        { ...sampleChannel, id: 'ch-2', name: 'Anthropic Backup', endpoint: 'https://api.anthropic.com/v1/messages' },
      ]
      mockSelect
        .mockReturnValueOnce(createWhereSelectChain(channels))
        .mockReturnValueOnce(createWhereSelectChain([sampleCredential]))
        .mockReturnValueOnce(createWhereSelectChain([sampleCredential]))
        .mockReturnValueOnce(createWhereSelectChain([{ ...sampleCredential, id: 'cred-2', channelId: 'ch-2' }]))
        .mockReturnValueOnce(createWhereSelectChain([{ ...sampleCredential, id: 'cred-2', channelId: 'ch-2', status: 'error' }]))
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(JSON.stringify({ data: [{ id: 'gpt-4o' }] })),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: vi.fn().mockResolvedValue('Service unavailable'),
        })
      mockUpdate.mockReturnValue(createUpdateChain())

      const response = asResponse<any>(
        await channelHealthCheckHandler(
          createMockEvent({
            context: { principal: { isAdmin: true, organizationId: 'org-1' } },
            body: {},
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.total).toBe(2)
      expect(response.data.healthy).toBe(1)
      expect(response.data.unhealthy).toBe(1)
      expect(response.data.results).toHaveLength(2)
    })

    it('should scope health check to organization channels', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelHealthCheckHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-empty' } },
          body: { channelId: 'ch-1' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在或无权访问')
    })
  })

  describe('channel [id]/stats.get', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelStatsHandler(
        createMockEvent({
          context: { principal: { isAdmin: false, organizationId: 'org-1' } },
          params: { id: 'ch-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return channel stats with trend data', async () => {
      setupStatsDbMocks(sampleChannel, { total: 100, success: 95, avg: 120 })

      const response = asResponse<any>(
        await channelStatsHandler(
          createMockEvent({
            context: { principal: { isAdmin: true } },
            params: { id: 'ch-1' },
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.channel).toEqual(sampleChannel)
      expect(response.data.stats.totalRequests).toBe(100)
      expect(response.data.stats.successRate).toBe('95.0%')
      expect(response.data.stats.avgLatency).toBe(120)
      expect(response.data.stats.trend).toHaveLength(24)
    })

    it('should return 404 when channel not found', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelStatsHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在')
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })

    it('should return 404 when channel is outside organization scope', async () => {
      mockSelect.mockReturnValue(createWhereSelectChain([]))

      const response = await channelStatsHandler(
        createMockEvent({
          context: { principal: { isAdmin: true, organizationId: 'org-other' } },
          params: { id: 'ch-1' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('渠道不存在')
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })

    it('should return zero success rate when no requests recorded', async () => {
      setupStatsDbMocks(sampleChannel, { total: 0, success: 0, avg: 0 })

      const response = asResponse<any>(
        await channelStatsHandler(
          createMockEvent({
            context: { principal: { isAdmin: true, organizationId: 'org-1' } },
            params: { id: 'ch-1' },
          }),
        ),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data.stats.totalRequests).toBe(0)
      expect(response.data.stats.successRate).toBe('0%')
      expect(response.data.stats.avgLatency).toBe(0)
    })
  })

  describe('channel [id].delete', () => {
    it('should delete channel and write audit log', async () => {
      const deleted = { id: 'ch-del', name: 'OpenAI', vendor: 'openai' }
      mockSelect.mockReturnValue(createWhereSelectChain([deleted]))
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const event = createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'ch-del' },
      })
      const response = await channelDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'channel.delete',
        { type: 'channel', id: 'ch-del' },
        deleted,
        null,
      )
    })
  })
})
