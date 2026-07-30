import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auditLog } from '../audit-log'

const mockInsert = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  logs: {},
}))

function createInsertValuesChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  }
}

describe('auditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip audit insert without authenticated principal', async () => {
    await auditLog(
      {
        context: {},
        node: { req: { headers: {} } },
        method: 'POST',
      } as any,
      'channel.update',
      { type: 'channel', id: 'ch-1' },
      {},
      {},
    )

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should redact sensitive values in before and after payloads', async () => {
    const insertChain = createInsertValuesChain()
    mockInsert.mockReturnValue(insertChain)

    await auditLog(
      {
        context: { principal: { userId: 'admin-1' } },
        method: 'PUT',
        node: {
          req: {
            headers: {
              'user-agent': 'Mozilla/5.0',
              'x-forwarded-for': '203.0.113.1, 10.0.0.1',
            },
            socket: { remoteAddress: '127.0.0.1' },
          },
        },
      } as any,
      'channel.update',
      { type: 'channel', id: 'ch-1' },
      {
        name: 'OpenAI',
        apiKey: 'sk-before',
        nested: { password: 'secret' },
      },
      {
        name: 'OpenAI New',
        authConfig: { token: 'token-after' },
        headers: { Authorization: 'Bearer secret' },
      },
    )

    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'admin-1',
      ip: '203.0.113.1',
      action: 'channel.update',
      method: 'PUT',
      targetType: 'channel',
      targetId: 'ch-1',
      before: {
        name: 'OpenAI',
        apiKey: '***REDACTED***',
        nested: { password: '***REDACTED***' },
      },
      after: {
        name: 'OpenAI New',
        authConfig: '***REDACTED***',
        headers: { Authorization: '***REDACTED***' },
      },
    }))
  })
})
