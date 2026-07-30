import { beforeEach, describe, expect, it, vi } from 'vitest'
import healthHandler from '../health.get'

const mockExecute = vi.fn()
const mockSetResponseStatus = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

vi.stubGlobal('getQuery', (event: { _query?: Record<string, string> }) => event._query || {})
vi.stubGlobal('setResponseStatus', (...args: unknown[]) => mockSetResponseStatus(...args))

describe('health handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns liveness status without database checks', async () => {
    const response = await healthHandler({ _query: {} } as never)

    expect(response.status).toBe('ok')
    expect(mockExecute).not.toHaveBeenCalled()
  })

  it('returns readiness ok when database and pgvector are available', async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [{ ok: 1 }] })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })

    const response = await healthHandler({ _query: { mode: 'ready' } } as never)

    expect(response).toMatchObject({
      status: 'ok',
      mode: 'ready',
      checks: { database: 'ok', pgvector: 'ok' },
    })
  })

  it('returns 503 when readiness check fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('database unavailable'))

    const response = await healthHandler({ _query: { mode: 'ready' } } as never)

    expect(mockSetResponseStatus).toHaveBeenCalledWith(expect.anything(), 503)
    expect(response).toMatchObject({
      status: 'error',
      mode: 'ready',
      error: 'database unavailable',
    })
  })
})
