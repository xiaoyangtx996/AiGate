import { describe, expect, it } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { apiRoutePolicy, matchApiRoute, normalizeApiRoutePath } from '../routes'

interface Principal {
  isAdmin: boolean
}

function resolveApiAccess(path: string, method: string, principal?: Principal) {
  if (!path.startsWith('/api')) {
    return { action: 'skip' as const }
  }

  const policyPath = normalizeApiRoutePath(path)

  if (apiRoutePolicy.isPublicRoute(policyPath)) {
    return { action: 'allow' as const, reason: 'public' }
  }

  if (!principal) {
    return { action: 'unauthorized' as const }
  }

  if (apiRoutePolicy.isAuthenticatedRoute(policyPath, method)) {
    return { action: 'allow' as const, reason: 'authenticated' }
  }

  if (apiRoutePolicy.isAdminRoute(policyPath) && !principal.isAdmin) {
    return {
      action: 'forbidden' as const,
      code: RESPONSE_CODE.FORBIDDEN,
      msg: '当前账号无权访问该资源',
    }
  }

  return { action: 'allow' as const, reason: 'default' }
}

describe('auth route policy', () => {
  describe('matchApiRoute', () => {
    it('should match exact route paths', () => {
      expect(matchApiRoute('/api/auth', ['/api/auth'])).toBe(true)
      expect(matchApiRoute('/api/gateway', ['/api/gateway'])).toBe(true)
    })

    it('should match route prefixes', () => {
      expect(matchApiRoute('/api/auth/callback/github', ['/api/auth'])).toBe(true)
      expect(matchApiRoute('/api/aigate/api-key/abc', ['/api/aigate/api-key'])).toBe(true)
      expect(matchApiRoute('/api/_nuxt/dev.json', ['/api/_'])).toBe(true)
    })

    it('should not match unrelated paths', () => {
      expect(matchApiRoute('/api/aigate/dashboard', ['/api/auth'])).toBe(false)
      expect(matchApiRoute('/app/auth', ['/api/auth'])).toBe(false)
      expect(matchApiRoute('/api/oauth/token', ['/api/auth'])).toBe(false)
    })

    it('should not match paths that only share a text prefix', () => {
      expect(matchApiRoute('/api/authentication', ['/api/auth'])).toBe(false)
      expect(matchApiRoute('/api/aigate/api-key-extra', ['/api/aigate/api-key'])).toBe(false)
    })

    it('should support explicit internal route prefixes', () => {
      expect(matchApiRoute('/api/_nuxt/dev.json', ['/api/_'])).toBe(true)
    })

    it('should return false for empty route list', () => {
      expect(matchApiRoute('/api/auth', [])).toBe(false)
    })
  })

  describe('resolveApiAccess', () => {
    it('should allow public auth routes without principal', () => {
      expect(resolveApiAccess('/api/auth/sign-in', 'POST')).toEqual({
        action: 'allow',
        reason: 'public',
      })
      expect(resolveApiAccess('/api/auth/session', 'GET')).toEqual({
        action: 'allow',
        reason: 'public',
      })
    })

    it('should allow authenticated GET menu routes for signed-in users', () => {
      expect(resolveApiAccess('/api/system-settings/menu-manage', 'GET', { isAdmin: false })).toEqual({
        action: 'allow',
        reason: 'authenticated',
      })
    })

    it('should forbid non-admin access to admin routes', () => {
      expect(resolveApiAccess('/api/aigate/api-key', 'GET', { isAdmin: false })).toEqual({
        action: 'forbidden',
        code: RESPONSE_CODE.FORBIDDEN,
        msg: '当前账号无权访问该资源',
      })
    })

    it.each([
      '/api/aigate/organization',
      '/api/aigate/api-key',
      '/api/aigate/channel',
      '/api/aigate/member',
      '/api/system-settings/user-manage',
      '/api/system-settings/role-manage',
      '/api/system-settings/operation-log',
    ])('should forbid non-admin access to %s', path => {
      expect(resolveApiAccess(path, 'GET', { isAdmin: false })).toMatchObject({
        action: 'forbidden',
        code: RESPONSE_CODE.FORBIDDEN,
      })
    })

    it('should allow admin access to admin routes', () => {
      expect(resolveApiAccess('/api/aigate/member/invite', 'POST', { isAdmin: true })).toEqual({
        action: 'allow',
        reason: 'default',
      })
    })

    it('should skip non-api paths', () => {
      expect(resolveApiAccess('/auth/sign-in', 'GET')).toEqual({ action: 'skip' })
      expect(resolveApiAccess('/aigate/dashboard', 'GET')).toEqual({ action: 'skip' })
    })

    it('should require principal for protected business routes', () => {
      expect(resolveApiAccess('/api/aigate/dashboard', 'GET')).toEqual({ action: 'unauthorized' })
      expect(resolveApiAccess('/api/aigate/dashboard', 'GET', { isAdmin: false })).toEqual({
        action: 'allow',
        reason: 'default',
      })
    })

    it('should apply existing auth policy to v1 aigate aliases', () => {
      expect(resolveApiAccess('/api/v1/aigate/dashboard', 'GET')).toEqual({ action: 'unauthorized' })
      expect(resolveApiAccess('/api/v1/aigate/dashboard', 'GET', { isAdmin: false })).toEqual({
        action: 'allow',
        reason: 'default',
      })
      expect(resolveApiAccess('/api/v1/aigate/channel', 'GET', { isAdmin: false })).toMatchObject({
        action: 'forbidden',
        code: RESPONSE_CODE.FORBIDDEN,
      })
    })
  })

  describe('auth-related route boundaries', () => {
    it('should treat gateway routes as public', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/gateway/v1/chat/completions')).toBe(true)
      expect(resolveApiAccess('/api/gateway/v1/chat/completions', 'POST')).toEqual({
        action: 'allow',
        reason: 'public',
      })
    })

    it('should not treat dashboard as public or admin-only', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/aigate/dashboard')).toBe(false)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/dashboard')).toBe(false)
    })
  })
})
