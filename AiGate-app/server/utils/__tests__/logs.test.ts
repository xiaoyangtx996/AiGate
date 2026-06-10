import { describe, expect, it } from 'vitest'
import { sanitizeHeaders, sanitizeLogData } from '../logs'

describe('logs utils', () => {
  describe('sanitizeLogData', () => {
    it('should redact top-level sensitive keys', () => {
      const result = sanitizeLogData({
        username: 'alice',
        password: 'secret123',
        token: 'abc',
        api_key: 'key-1',
      })

      expect(result).toEqual({
        username: 'alice',
        password: '***REDACTED***',
        token: '***REDACTED***',
        api_key: '***REDACTED***',
      })
    })

    it('should redact nested sensitive fields', () => {
      const result = sanitizeLogData({
        user: {
          name: 'bob',
          credentials: {
            authorization: 'Bearer xyz',
          },
        },
        count: 3,
      })

      expect(result).toEqual({
        user: {
          name: 'bob',
          credentials: {
            authorization: '***REDACTED***',
          },
        },
        count: 3,
      })
    })

    it('should preserve arrays and non-sensitive values', () => {
      const result = sanitizeLogData({
        tags: ['a', 'b'],
        status: 'ok',
        secretField: 'hidden',
      })

      expect(result.tags).toEqual(['a', 'b'])
      expect(result.status).toBe('ok')
      expect(result.secretField).toBe('***REDACTED***')
    })

    it('should match sensitive keys case-insensitively', () => {
      const result = sanitizeLogData({
        Authorization: 'Bearer token',
        X_API_KEY: 'key',
        Cookie: 'session=1',
      })

      expect(result.Authorization).toBe('***REDACTED***')
      expect(result.X_API_KEY).toBe('***REDACTED***')
      expect(result.Cookie).toBe('***REDACTED***')
    })
  })

  describe('sanitizeHeaders', () => {
    it('should redact sensitive headers', () => {
      const result = sanitizeHeaders({
        'content-type': 'application/json',
        'authorization': 'Bearer token',
        'x-api-key': 'secret',
        'cookie': 'sid=1',
        'set-cookie': 'sid=1; HttpOnly',
        'proxy-authorization': 'Basic abc',
      })

      expect(result).toEqual({
        'content-type': 'application/json',
        'authorization': '***REDACTED***',
        'x-api-key': '***REDACTED***',
        'cookie': '***REDACTED***',
        'set-cookie': '***REDACTED***',
        'proxy-authorization': '***REDACTED***',
      })
    })

    it('should redact headers case-insensitively', () => {
      const result = sanitizeHeaders({
        'Authorization': 'Bearer token',
        'Cookie': 'sid=1',
        'Content-Type': 'text/plain',
      })

      expect(result.Authorization).toBe('***REDACTED***')
      expect(result.Cookie).toBe('***REDACTED***')
      expect(result['Content-Type']).toBe('text/plain')
    })

    it('should return empty object for empty headers', () => {
      expect(sanitizeHeaders({})).toEqual({})
    })

    it('should preserve non-sensitive headers unchanged', () => {
      const result = sanitizeHeaders({
        'accept': 'application/json',
        'user-agent': 'vitest',
        'x-request-id': 'req-1',
      })

      expect(result).toEqual({
        'accept': 'application/json',
        'user-agent': 'vitest',
        'x-request-id': 'req-1',
      })
    })
  })

  describe('sanitizeLogData edge cases', () => {
    it('should redact keys containing sensitive substrings', () => {
      const result = sanitizeLogData({
        mySecretValue: 'hidden',
        refreshToken: 'token-1',
        clientApiKey: 'key-2',
        plainField: 'visible',
      })

      expect(result.mySecretValue).toBe('***REDACTED***')
      expect(result.refreshToken).toBe('***REDACTED***')
      expect(result.clientApiKey).toBe('***REDACTED***')
      expect(result.plainField).toBe('visible')
    })

    it('should leave null and primitive nested values untouched', () => {
      const result = sanitizeLogData({
        meta: {
          note: null,
          count: 0,
          enabled: false,
        },
      })

      expect(result.meta).toEqual({
        note: null,
        count: 0,
        enabled: false,
      })
    })

    it('should not recurse into arrays even when items look sensitive', () => {
      const tags = [{ password: 'secret' }]
      const result = sanitizeLogData({ tags })

      expect(result.tags).toBe(tags)
    })

    it('should handle empty objects', () => {
      expect(sanitizeLogData({})).toEqual({})
    })
  })
})
