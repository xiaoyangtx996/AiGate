import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkDailyLimit,
  checkIpWhitelist,
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
  channel: { id: 'id', status: 'status', priority: 'priority', health: 'health', enabled: 'enabled' },
  channelCredential: {
    id: 'id',
    channelId: 'channelId',
    status: 'status',
    cooldownUntil: 'cooldownUntil',
    sort: 'sort',
    createdAt: 'createdAt',
  },
  aiModel: { name: 'name', enabled: 'enabled', status: 'status', sourceChannelId: 'sourceChannelId' },
  modelCombo: { id: 'id', name: 'name', enabled: 'enabled', organizationId: 'organizationId' },
  modelComboItem: { comboId: 'comboId', channelId: 'channelId', sort: 'sort', createdAt: 'createdAt' },
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

function createCredentialSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createLimitSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
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
      mockSelect
        .mockReturnValueOnce(
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
        .mockReturnValueOnce(createCredentialSelectChain([
          {
            id: 'cred-1',
            name: 'Primary',
            apiKey: 'sk-channel',
            status: 'active',
            cooldownUntil: null,
          },
        ]))

      const result = await selectChannel()

      expect(result?.id).toBe('ch-2')
      expect(result?.credentialId).toBe('cred-1')
      expect(result?.apiKey).toBe('sk-channel')
    })

    it('should skip healthy channels without active credentials', async () => {
      mockSelect
        .mockReturnValueOnce(
          createChannelSelectChain([
            {
              id: 'ch-1',
              endpoint: 'https://a.com/v1',
              vendor: 'openai',
              priority: 1,
              status: 'enabled',
              health: 'healthy',
            },
          ]),
        )
        .mockReturnValueOnce(createCredentialSelectChain([]))

      expect(await selectChannel()).toBeNull()
    })

    it('should return null when all channels are down', async () => {
      mockSelect.mockReturnValue(
        createChannelSelectChain([
          { id: 'ch-1', health: 'down', status: 'enabled', priority: 1, endpoint: 'https://a.com', vendor: 'openai' },
        ]),
      )

      expect(await selectChannel()).toBeNull()
    })

    it('should rotate active credentials in the same channel', async () => {
      const channel = {
        id: 'ch-rotate',
        endpoint: 'https://a.com/v1',
        vendor: 'openai',
        priority: 1,
        status: 'enabled',
        health: 'healthy',
      }
      const credentials = [
        { id: 'cred-1', name: 'Key 1', apiKey: 'sk-1', status: 'active', cooldownUntil: null },
        { id: 'cred-2', name: 'Key 2', apiKey: 'sk-2', status: 'active', cooldownUntil: null },
      ]
      mockSelect
        .mockReturnValueOnce(createChannelSelectChain([channel]))
        .mockReturnValueOnce(createCredentialSelectChain(credentials))
        .mockReturnValueOnce(createChannelSelectChain([channel]))
        .mockReturnValueOnce(createCredentialSelectChain(credentials))

      const first = await selectChannel()
      const second = await selectChannel()

      expect(first?.credentialId).toBe('cred-1')
      expect(second?.credentialId).toBe('cred-2')
    })

    it('should prefer combo candidates and rewrite to combo item model name', async () => {
      mockSelect
        .mockReturnValueOnce(createLimitSelectChain([{ id: 'combo-1', name: 'premium-chat', enabled: true }]))
        .mockReturnValueOnce(createCredentialSelectChain([{ comboId: 'combo-1', channelId: 'ch-combo', modelName: 'gpt-4o-mini' }]))
        .mockReturnValueOnce(createLimitSelectChain([{
          id: 'ch-combo',
          endpoint: 'https://combo.example.com/v1',
          vendor: 'openai',
          priority: 1,
          status: 'enabled',
          health: 'healthy',
        }]))
        .mockReturnValueOnce(createCredentialSelectChain([
          { id: 'cred-combo', name: 'Combo Key', apiKey: 'sk-combo', status: 'active', cooldownUntil: null },
        ]))
        .mockReturnValueOnce(createWhereSelectChain([]))

      const result = await selectChannel('premium-chat', 'org-1')

      expect(result).toMatchObject({
        id: 'ch-combo',
        credentialId: 'cred-combo',
        modelName: 'gpt-4o-mini',
      })
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

    it('should allow until daily usage reaches the limit', async () => {
      mockSelect.mockReturnValueOnce(createCountSelectChain(4))
      await expect(checkDailyLimit('key-1', 5)).resolves.toEqual({ allowed: true, used: 4, limit: 5 })

      mockSelect.mockReturnValueOnce(createCountSelectChain(5))
      await expect(checkDailyLimit('key-1', 5)).resolves.toEqual({ allowed: false, used: 5, limit: 5 })
    })
  })

  describe('checkIpWhitelist', () => {
    it('should allow empty whitelist', () => {
      expect(checkIpWhitelist({ ipWhitelist: [] }, '203.0.113.10')).toBe(true)
      expect(checkIpWhitelist({ ipWhitelist: null }, '203.0.113.10')).toBe(true)
    })

    it('should match exact IP and CIDR ranges', () => {
      const keyRecord = { ipWhitelist: ['203.0.113.10', '10.20.30.0/24'] }

      expect(checkIpWhitelist(keyRecord, '203.0.113.10')).toBe(true)
      expect(checkIpWhitelist(keyRecord, '10.20.30.55')).toBe(true)
      expect(checkIpWhitelist(keyRecord, '10.20.31.55')).toBe(false)
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

    it('should retry fallback candidates on retryable upstream status', async () => {
      mockFetch
        .mockResolvedValueOnce({
          status: 500,
          headers: new Headers({}),
          text: async () => '{"error":"temporary"}',
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: new Headers({ 'x-request-id': 'fallback' }),
          text: async () => '{"ok":true}',
        })

      const result = await proxyToChannel(
        {
          id: 'ch-primary',
          endpoint: 'https://primary.example.com/v1',
          vendor: 'openai',
          priority: 1,
          status: 'enabled',
          health: 'healthy',
          fallbacks: [{
            id: 'ch-fallback',
            endpoint: 'https://fallback.example.com/v1',
            vendor: 'openai',
            priority: 2,
            status: 'enabled',
            health: 'healthy',
          }],
        },
        'chat/completions',
        'POST',
        {},
        { model: 'premium-chat' },
      )

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://primary.example.com/v1/chat/completions', expect.anything())
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://fallback.example.com/v1/chat/completions', expect.anything())
      expect(result.status).toBe(200)
      expect(result.body).toBe('{"ok":true}')
    })

    it('should rewrite request model when candidate has mapped model name', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        headers: new Headers({}),
        text: async () => '{"ok":true}',
      })

      await proxyToChannel(
        {
          id: 'ch-combo',
          endpoint: 'https://combo.example.com/v1',
          vendor: 'openai',
          priority: 1,
          status: 'enabled',
          health: 'healthy',
          modelName: 'gpt-4o-mini',
        },
        'chat/completions',
        'POST',
        {},
        { model: 'premium-chat', messages: [] },
      )

      const options = mockFetch.mock.calls[0]![1] as RequestInit
      expect(JSON.parse(options.body as string)).toMatchObject({ model: 'gpt-4o-mini' })
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
