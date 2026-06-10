import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkDailyLimit,
  proxyToChannel,
  proxyToChannelStream,
  selectChannel,
  validateApiKeyFromHeader,
} from '#server/utils/gateway'

const mockSelect = vi.fn()
const mockFetch = vi.fn()

vi.stubGlobal('createError', (opts: { statusCode: number; statusMessage: string }) => {
  const err = new Error(opts.statusMessage) as Error & { statusCode: number }
  err.statusCode = opts.statusCode
  return err
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  channel: { status: 'status', priority: 'priority', health: 'health' },
  apiKey: { key: 'key', status: 'status', expiresAt: 'expiresAt' },
  apiLog: { apiKeyId: 'apiKeyId', createdAt: 'createdAt' },
}))

function createChannelSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createKeySelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createCountSelectChain(count: number) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count }]),
    }),
  }
}

describe('gateway integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', mockFetch)
  })

  describe('selectChannel', () => {
    it('should return first healthy channel by priority', async () => {
      mockSelect.mockReturnValue(
        createChannelSelectChain([
          {
            id: 'ch-1',
            endpoint: 'https://a.com/v1',
            vendor: 'openai',
            priority: 1,
            status: 'enabled',
            health: 'down',
          },
          {
            id: 'ch-2',
            endpoint: 'https://b.com/v1',
            vendor: 'openai',
            priority: 2,
            status: 'enabled',
            health: 'healthy',
          },
        ]),
      )

      const result = await selectChannel()

      expect(result?.id).toBe('ch-2')
    })

    it('should return null when all channels are down', async () => {
      mockSelect.mockReturnValue(
        createChannelSelectChain([
          { id: 'ch-1', health: 'down', status: 'enabled', priority: 1, endpoint: 'https://a.com', vendor: 'openai' },
        ]),
      )

      expect(await selectChannel()).toBeNull()
    })
  })

  describe('validateApiKeyFromHeader', () => {
    it('should return null for missing or invalid auth header', async () => {
      expect(await validateApiKeyFromHeader(undefined)).toBeNull()
      expect(await validateApiKeyFromHeader('Basic abc')).toBeNull()
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return null for inactive or expired keys', async () => {
      mockSelect.mockReturnValueOnce(createKeySelectChain([{ key: 'ag-key', status: 'revoked', expiresAt: null }]))
      expect(await validateApiKeyFromHeader('Bearer ag-key')).toBeNull()

      mockSelect.mockReturnValueOnce(
        createKeySelectChain([{ key: 'ag-exp', status: 'active', expiresAt: new Date('2020-01-01') }]),
      )
      expect(await validateApiKeyFromHeader('Bearer ag-exp')).toBeNull()
    })

    it('should return active non-expired key', async () => {
      const keyRecord = { key: 'ag-valid', status: 'active', expiresAt: new Date('2099-01-01') }
      mockSelect.mockReturnValue(createKeySelectChain([keyRecord]))

      expect(await validateApiKeyFromHeader('Bearer ag-valid')).toEqual(keyRecord)
    })
  })

  describe('checkDailyLimit', () => {
    it('should allow when dailyLimit is null', async () => {
      expect(await checkDailyLimit('key-1', null)).toEqual({ allowed: true, used: 0, limit: null })
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should block when usage reaches limit', async () => {
      mockSelect.mockReturnValue(createCountSelectChain(100))

      const result = await checkDailyLimit('key-1', 100)

      expect(result).toEqual({ allowed: false, used: 100, limit: 100 })
    })
  })

  describe('proxyToChannel', () => {
    it('should call upstream endpoint and return response metadata', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers({ 'x-request-id': 'req-1' }),
        text: async () => '{"ok":true}',
      })

      const result = await proxyToChannel(
        {
          id: 'ch-1',
          endpoint: 'https://api.example.com/v1/',
          vendor: 'openai',
          priority: 1,
          status: 'enabled',
          health: 'healthy',
        },
        'chat/completions',
        'POST',
        { Authorization: 'Bearer sk-test' },
        { model: 'gpt-4o' },
      )

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/chat/completions',
        expect.objectContaining({ method: 'POST' }),
      )
      expect(result.status).toBe(200)
      expect(result.body).toBe('{"ok":true}')
      expect(result.headers['x-request-id']).toBe('req-1')
      expect(result.latency).toBeGreaterThanOrEqual(0)
    })
  })

  describe('proxyToChannelStream', () => {
    it('should throw when upstream stream fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        body: null,
        text: async () => 'bad gateway',
      })

      await expect(
        proxyToChannelStream(
          {
            id: 'ch-1',
            endpoint: 'https://api.example.com/v1',
            vendor: 'openai',
            priority: 1,
            status: 'enabled',
            health: 'healthy',
          },
          'chat/completions',
          'POST',
          {},
          { stream: true },
        ),
      ).rejects.toMatchObject({ statusCode: 502 })
    })

    it('should return response when stream is ok', async () => {
      const streamResponse = { ok: true, body: {}, status: 200 }
      mockFetch.mockResolvedValue(streamResponse)

      const result = await proxyToChannelStream(
        {
          id: 'ch-1',
          endpoint: 'https://api.example.com/v1',
          vendor: 'openai',
          priority: 1,
          status: 'enabled',
          health: 'healthy',
        },
        'chat/completions',
        'POST',
        {},
      )

      expect(result).toBe(streamResponse)
    })
  })
})
