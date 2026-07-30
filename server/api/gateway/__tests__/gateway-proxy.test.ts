import { beforeEach, describe, expect, it, vi } from 'vitest'

import gatewayProxyHandler from '../[...path]'

const mockValidateApiKey = vi.fn()
const mockCheckIpWhitelist = vi.fn()
const mockGetClientIpFromGatewayEvent = vi.fn()
const mockCheckApiKeyScopes = vi.fn()
const mockCheckDailyLimit = vi.fn()
const mockSelectChannel = vi.fn()
const mockProxyToChannel = vi.fn()
const mockProxyToChannelStream = vi.fn()
const mockRateCheck = vi.fn()
const mockConsumeQuota = vi.fn()
const mockGetSetting = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelect = vi.fn()
const insertedValues: unknown[] = []

vi.mock('#server/utils/gateway', () => ({
  validateApiKeyFromHeader: (...args: unknown[]) => mockValidateApiKey(...args),
  getClientIpFromGatewayEvent: (...args: unknown[]) => mockGetClientIpFromGatewayEvent(...args),
  checkIpWhitelist: (...args: unknown[]) => mockCheckIpWhitelist(...args),
  checkApiKeyScopes: (...args: unknown[]) => mockCheckApiKeyScopes(...args),
  checkDailyLimit: (...args: unknown[]) => mockCheckDailyLimit(...args),
  selectChannel: (...args: unknown[]) => mockSelectChannel(...args),
  proxyToChannel: (...args: unknown[]) => mockProxyToChannel(...args),
  proxyToChannelStream: (...args: unknown[]) => mockProxyToChannelStream(...args),
}))

vi.mock('#server/utils/rate-limit', () => ({
  rateLimiter: {
    check: (...args: unknown[]) => mockRateCheck(...args),
  },
}))

vi.mock('#server/utils/quota', () => ({
  consumeQuota: (...args: unknown[]) => mockConsumeQuota(...args),
}))

vi.mock('#server/utils/system-settings', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  aiModel: {
    name: 'name',
    enabled: 'enabled',
    status: 'status',
    sourceChannelId: 'sourceChannelId',
    inputPrice: 'inputPrice',
    outputPrice: 'outputPrice',
  },
  apiKey: { id: 'id', calls: 'calls', cost: 'cost', lastUsed: 'lastUsed' },
  apiLog: {
    userId: 'userId',
    apiKeyId: 'apiKeyId',
    organizationId: 'organizationId',
    model: 'model',
    provider: 'provider',
    type: 'type',
    inputTokens: 'inputTokens',
    outputTokens: 'outputTokens',
    totalTokens: 'totalTokens',
    tokensEstimated: 'tokensEstimated',
    cost: 'cost',
    latency: 'latency',
    statusCode: 'statusCode',
    status: 'status',
    prompt: 'prompt',
    response: 'response',
    errorMessage: 'errorMessage',
    traceId: 'traceId',
  },
}))

function createEvent(
  options: {
    method?: string
    authHeader?: string
    path?: string
    body?: unknown
    ip?: string
  } = {},
) {
  const headers = new Map<string, string>()
  if (options.authHeader) headers.set('authorization', options.authHeader)
  if (options.ip) headers.set('x-forwarded-for', options.ip)

  return {
    method: options.method ?? 'POST',
    node: { req: { socket: { remoteAddress: options.ip || '127.0.0.1' } } },
    _headers: headers,
    _params: { path: options.path ?? 'v1/chat/completions' },
    _body: options.body,
  }
}

vi.stubGlobal('getRequestHeader', (event: { _headers: Map<string, string> }, name: string) => {
  return event._headers.get(name.toLowerCase())
})

vi.stubGlobal('getRouterParam', (event: { _params: Record<string, string> }, name: string) => event._params[name])

vi.stubGlobal('setResponseStatus', vi.fn())
vi.stubGlobal('setResponseHeader', vi.fn())
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('readBody', async (event: { _body?: unknown }) => event._body ?? {})

function createInsertChain() {
  return {
    values: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue(undefined),
    }).mockImplementation((value: unknown) => {
      insertedValues.push(value)
      return { execute: vi.fn().mockResolvedValue(undefined) }
    }),
  }
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }
}

function createModelPriceSelectChain(result = [{ inputPrice: 0.01, outputPrice: 0.02 }]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('gateway proxy handler', () => {
  const validKey = {
    id: 'key-1',
    userId: 'user-1',
    organizationId: 'org-1',
    roleIds: [],
    scopes: ['read', 'write'],
    dailyLimit: 1000,
    rateLimitPerMin: 100,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    insertedValues.length = 0
    mockValidateApiKey.mockResolvedValue(validKey)
    mockGetClientIpFromGatewayEvent.mockImplementation(event => event.node.req.socket.remoteAddress || '127.0.0.1')
    mockCheckIpWhitelist.mockReturnValue(true)
    mockCheckApiKeyScopes.mockReturnValue(true)
    mockCheckDailyLimit.mockResolvedValue({ allowed: true, used: 1, limit: 1000 })
    mockRateCheck.mockReturnValue({ allowed: true, remaining: 99, resetIn: 30000 })
    mockGetSetting.mockResolvedValue(false)
    mockSelectChannel.mockResolvedValue({ id: 'ch-1', vendor: 'openai', endpoint: 'https://api.example.com/v1' })
    mockProxyToChannel.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ usage: { total_tokens: 10 }, choices: [{ message: { content: 'ok' } }] }),
      headers: { 'content-type': 'application/json' },
    })
    mockInsert.mockReturnValue(createInsertChain())
    mockUpdate.mockReturnValue(createUpdateChain())
    mockSelect.mockReturnValue(createModelPriceSelectChain())
    mockConsumeQuota.mockResolvedValue(undefined)
  })

  it('should reject invalid api key with 401', async () => {
    mockValidateApiKey.mockResolvedValue(null)

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer bad' }) as never)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired API key',
    })
  })

  it('should reject ip not in whitelist with 403', async () => {
    mockCheckIpWhitelist.mockReturnValue(false)

    await expect(
      gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid', ip: '10.0.0.1' }) as never),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'IP not in whitelist',
    })
  })

  it('should validate whitelist with the forwarded client IP', async () => {
    mockGetClientIpFromGatewayEvent.mockReturnValue('203.0.113.10')
    await gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid', ip: '203.0.113.10' }) as never)

    expect(mockCheckIpWhitelist).toHaveBeenCalledWith(validKey, '203.0.113.10')
  })

  it('should reject when daily limit exceeded', async () => {
    mockCheckDailyLimit.mockResolvedValue({ allowed: false, used: 1000, limit: 1000 })

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('should reject the sixth request when dailyLimit is 5', async () => {
    mockValidateApiKey.mockResolvedValue({ ...validKey, dailyLimit: 5 })
    mockCheckDailyLimit.mockResolvedValue({ allowed: false, used: 5, limit: 5 })

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 429,
      message: 'Daily limit exceeded (5/5)',
    })
    expect(mockCheckDailyLimit).toHaveBeenCalledWith('key-1', 5)
  })

  it('should reject when rate limit exceeded', async () => {
    mockRateCheck.mockReturnValue({ allowed: false, remaining: 0, resetIn: 15000 })

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 429,
      message: 'Rate limit exceeded',
    })
  })

  it('should reject role-restricted keys without admin scope', async () => {
    mockValidateApiKey.mockResolvedValue({ ...validKey, roleIds: ['role-1'], scopes: ['read', 'write'] })

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Role-restricted API keys cannot access gateway directly',
    })
  })

  it('should reject when api key lacks write scope for POST', async () => {
    mockCheckApiKeyScopes.mockReturnValue(false)

    await expect(
      gatewayProxyHandler(
        createEvent({
          authHeader: 'Bearer valid',
          method: 'POST',
        }) as never,
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'API key lacks required scope for this method',
    })
  })

  it('should reject when no upstream channel available', async () => {
    mockSelectChannel.mockResolvedValue(null)

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 503,
      message: 'No available upstream channel',
    })
  })

  it('should persist parsed input/output tokens for non-stream responses', async () => {
    mockProxyToChannel.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 } }),
      headers: { 'content-type': 'application/json' },
    })

    await gatewayProxyHandler(createEvent({
      authHeader: 'Bearer valid',
      body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] },
    }) as never)

    expect(insertedValues[0]).toMatchObject({
      inputTokens: 11,
      outputTokens: 22,
      totalTokens: 33,
      tokensEstimated: false,
      cost: 0.00055,
    })
    expect(mockConsumeQuota).toHaveBeenCalledWith('org-1', 33, 0.00055)
  })

  it('should proxy stream request and persist usage from final SSE chunk', async () => {
    const encoder = new TextEncoder()
    const streamBody = [
      'data: {"choices":[{"delta":{"content":"hi"}}]}\n\n',
      'data: {"usage":{"prompt_tokens":4,"completion_tokens":6,"total_tokens":10}}\n\n',
      'data: [DONE]\n\n',
    ].join('')
    mockProxyToChannelStream.mockResolvedValue({
      status: 200,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamBody))
          controller.close()
        },
      }),
    })

    const response = await gatewayProxyHandler(createEvent({
      authHeader: 'Bearer valid',
      body: { model: 'gpt-4o', stream: true, messages: [{ role: 'user', content: 'hi' }] },
    }) as never)

    expect(response).toBeInstanceOf(ReadableStream)
    const reader = (response as ReadableStream<Uint8Array>).getReader()
    while (true) {
      const { done } = await reader.read()
      if (done)
        break
    }

    expect(mockProxyToChannelStream).toHaveBeenCalledTimes(1)
    expect(mockProxyToChannel).not.toHaveBeenCalled()
    expect(insertedValues[0]).toMatchObject({
      inputTokens: 4,
      outputTokens: 6,
      totalTokens: 10,
      tokensEstimated: false,
      cost: 0.00016,
    })
    expect(mockConsumeQuota).toHaveBeenCalledWith('org-1', 10, 0.00016)
  })

  it('should proxy request and return upstream body', async () => {
    const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] }
    const result = await gatewayProxyHandler(
      createEvent({
        authHeader: 'Bearer valid',
        body,
      }) as never,
    )

    expect(result).toContain('"total_tokens":10')
    expect(mockProxyToChannel).toHaveBeenCalledTimes(1)
    expect(mockConsumeQuota).toHaveBeenCalledWith('org-1', 10, 0.0002)
    expect(mockInsert).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('should not store request or response bodies when gateway debug is disabled', async () => {
    await gatewayProxyHandler(
      createEvent({
        authHeader: 'Bearer valid',
        body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] },
      }) as never,
    )

    expect(insertedValues[0]).toEqual(expect.objectContaining({
      prompt: undefined,
      response: undefined,
      traceId: expect.any(String),
    }))
  })

  it('should store redacted debug payloads when gateway debug is enabled', async () => {
    mockGetSetting.mockResolvedValue(true)
    mockProxyToChannel.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ data: { Authorization: 'Bearer upstream', content: 'ok' } }),
      headers: { 'content-type': 'application/json' },
    })

    await gatewayProxyHandler(
      createEvent({
        authHeader: 'Bearer valid',
        body: { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }], apiKey: 'sk-user' },
      }) as never,
    )

    const logRow = insertedValues[0] as { prompt?: string, response?: string }
    expect(logRow.prompt).toContain('***REDACTED***')
    expect(logRow.prompt).not.toContain('sk-user')
    expect(logRow.response).toContain('***REDACTED***')
    expect(logRow.response).not.toContain('Bearer upstream')
  })

  it('should return 502 when upstream proxy fails', async () => {
    mockProxyToChannel.mockRejectedValue(new Error('Connection refused'))

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 502,
      message: 'Upstream error',
    })

    expect(mockInsert).toHaveBeenCalled()
  })
})
