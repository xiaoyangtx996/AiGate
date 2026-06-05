import { describe, expect, it } from 'vitest'
import { sanitizeHeaders, sanitizeLogData } from '#server/utils/logs'

/** mirrors server/middleware/logs.ts skip conditions */
function shouldSkipOperationLog(path: string, method: string): boolean {
  if (!path.startsWith('/api')) return true
  if (method === 'GET') return true
  if (path.startsWith('/api/system-settings/operation-log')) return true
  return false
}

/** mirrors middleware persistence payload sanitization */
function buildOperationLogPayload(
  body: Record<string, unknown>,
  headers: Record<string, string>,
) {
  return {
    params: sanitizeLogData(body),
    headers: sanitizeHeaders(headers),
  }
}

describe('logs middleware behavior', () => {
  describe('shouldSkipOperationLog', () => {
    it('should skip non-api routes', () => {
      expect(shouldSkipOperationLog('/aigate/dashboard', 'POST')).toBe(true)
    })

    it('should skip GET api requests', () => {
      expect(shouldSkipOperationLog('/api/aigate/agent', 'GET')).toBe(true)
    })

    it('should skip operation-log endpoint to avoid recursion', () => {
      expect(shouldSkipOperationLog('/api/system-settings/operation-log', 'POST')).toBe(true)
    })

    it('should log mutating api requests', () => {
      expect(shouldSkipOperationLog('/api/aigate/agent', 'POST')).toBe(false)
      expect(shouldSkipOperationLog('/api/aigate/api-key', 'DELETE')).toBe(false)
    })
  })

  describe('buildOperationLogPayload', () => {
    it('should redact sensitive body and header fields before insert', () => {
      const payload = buildOperationLogPayload(
        { name: 'agent-1', password: 'secret123', token: 'abc' },
        {
          'content-type': 'application/json',
          authorization: 'Bearer token',
          cookie: 'sid=1',
        },
      )

      expect(payload).toEqual({
        params: {
          name: 'agent-1',
          password: '***REDACTED***',
          token: '***REDACTED***',
        },
        headers: {
          'content-type': 'application/json',
          authorization: '***REDACTED***',
          cookie: '***REDACTED***',
        },
      })
    })

    it('should preserve non-sensitive request metadata', () => {
      const payload = buildOperationLogPayload(
        { action: 'update', count: 2 },
        { 'user-agent': 'Playwright', accept: 'application/json' },
      )

      expect(payload.params).toEqual({ action: 'update', count: 2 })
      expect(payload.headers).toEqual({ 'user-agent': 'Playwright', accept: 'application/json' })
    })
  })
})
