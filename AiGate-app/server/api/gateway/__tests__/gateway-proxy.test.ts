import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockValidateApiKey = vi.fn()
const mockCheckIpWhitelist = vi.fn()
const mockCheckApiKeyScopes = vi.fn()
const mockCheckDailyLimit = vi.fn()
const mockSelectChannel = vi.fn()
const mockProxyToChannel = vi.fn()
const mockRateCheck = vi.fn()
const mockConsumeQuota = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('#server/utils/gateway', () => ({
  validateApiKeyFromHeader: (...args: unknown[]) => mockValidateApiKey(...args),
  checkIpWhitelist: (...args: unknown[]) => mockCheckIpWhitelist(...args),
  checkApiKeyScopes: (...args: unknown[]) => mockCheckApiKeyScopes(...args),
  checkDailyLimit: (...args: unknown[]) => mockCheckDailyLimit(...args),
  selectChannel: (...args: unknown[]) => mockSelectChannel(...args),
  proxyToChannel: (...args: unknown[]) => mockProxyToChannel(...args),
}))

vi.mock('#server/utils/rate-limit', () => ({
  rateLimiter: {
    check: (...args: unknown[]) => mockRateCheck(...args),
  },
}))

vi.mock('#server/utils/quota', () => ({
  consumeQuota: (...args: unknown[]) => mockConsumeQuota(...args),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiKey: { id: 'id', calls: 'calls', cost: 'cost', lastUsed: 'lastUsed' },
  apiLog: {
    userId: 'userId', apiKeyId: 'apiKeyId', organizationId: 'organizationId', model: 'model',
    provider: 'provider', type: 'type', inputTokens: 'inputTokens', outputTokens: 'outputTokens',
    totalTokens: 'totalTokens', cost: 'cost', latency: 'latency', statusCode: 'statusCode',
    status: 'status', prompt: 'prompt', response: 'response', errorMessage: 'errorMessage',
  },
}))

import gatewayProxyHandler from '../[...path]'

function createEvent(options: {
  method?: string
  authHeader?: string
  path?: string
  body?: unknown
  ip?: string
} = {}) {
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

function createInsertChain() {
  return {
    values: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue(undefined),
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
    mockValidateApiKey.mockResolvedValue(validKey)
    mockCheckIpWhitelist.mockReturnValue(true)
    mockCheckApiKeyScopes.mockReturnValue(true)
    mockCheckDailyLimit.mockResolvedValue({ allowed: true, used: 1, limit: 1000 })
    mockRateCheck.mockReturnValue({ allowed: true, remaining: 99, resetIn: 30000 })
    mockSelectChannel.mockResolvedValue({ id: 'ch-1', vendor: 'openai', endpoint: 'https://api.example.com/v1' })
    mockProxyToChannel.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ usage: { total_tokens: 10 }, choices: [{ message: { content: 'ok' } }] }),
      headers: { 'content-type': 'application/json' },
    })
    mockInsert.mockReturnValue(createInsertChain())
    mockUpdate.mockReturnValue(createUpdateChain())
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

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid', ip: '10.0.0.1' }) as never)).rejects.toMatchObject({
      statusCode: 403,
      message: 'IP not in whitelist',
    })
  })

  it('should reject when daily limit exceeded', async () => {
    mockCheckDailyLimit.mockResolvedValue({ allowed: false, used: 1000, limit: 1000 })

    await expect(gatewayProxyHandler(createEvent({ authHeader: 'Bearer valid' }) as never)).rejects.toMatchObject({
      statusCode: 429,
    })
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

    await expect(gatewayProxyHandler(createEvent({
      authHeader: 'Bearer valid',
      method: 'POST',
    }) as never)).rejects.toMatchObject({
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

  it('should proxy request and return upstream body', async () => {
    const body = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] }
    const result = await gatewayProxyHandler(createEvent({
      authHeader: 'Bearer valid',
      body,
    }) as never)

    expect(result).toContain('"total_tokens":10')
    expect(mockProxyToChannel).toHaveBeenCalledTimes(1)
    expect(mockConsumeQuota).toHaveBeenCalledWith('org-1', 10)
    expect(mockInsert).toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalled()
  })
})
