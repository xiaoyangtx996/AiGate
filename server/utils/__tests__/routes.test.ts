import { describe, expect, it } from 'vitest'
import { apiRoutePolicy, normalizeApiRoutePath } from '../routes'

describe('aPI Route Policy', () => {
  describe('versioned routes', () => {
    it('should normalize v1 aigate aliases to existing aigate paths', () => {
      expect(normalizeApiRoutePath('/api/v1/aigate')).toBe('/api/aigate')
      expect(normalizeApiRoutePath('/api/v1/aigate/channel')).toBe('/api/aigate/channel')
      expect(normalizeApiRoutePath('/api/v1/aigate/channel/abc?x=1')).toBe('/api/aigate/channel/abc?x=1')
      expect(normalizeApiRoutePath('/api/gateway/v1/chat/completions')).toBe('/api/gateway/v1/chat/completions')
    })

    it('should apply the same policy to v1 aigate aliases', () => {
      expect(apiRoutePolicy.isAdminRoute('/api/v1/aigate/channel')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/v1/aigate/dashboard')).toBe(false)
      expect(apiRoutePolicy.isPublicRoute('/api/v1/aigate/dashboard')).toBe(false)
    })
  })

  describe('admin Routes', () => {
    it('should identify admin routes', () => {
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/organization')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/api-key')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/channel')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/member')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/system-settings')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/system-settings/user-manage')).toBe(true)
    })

    it('should identify admin route subpaths', () => {
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/organization/tree')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/api-key/abc123')).toBe(true)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/member/invite')).toBe(true)
    })

    it('should not identify non-admin routes', () => {
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/dashboard')).toBe(false)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/agents')).toBe(false)
      expect(apiRoutePolicy.isAdminRoute('/api/auth/sign-in')).toBe(false)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/api-key-extra')).toBe(false)
    })
  })

  describe('public Routes', () => {
    it('should identify public routes', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/auth')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/auth/callback')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/common/releases')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/gateway')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/gateway/v1/chat/completions')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/openapi')).toBe(true)
    })

    it('should identify internal and locale public routes', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/_nuxt/something')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/system-settings/internalization/locales')).toBe(true)
      expect(apiRoutePolicy.isPublicRoute('/api/system-settings/internalization/locales/en')).toBe(true)
    })

    it('should not identify protected routes as public', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/aigate/dashboard')).toBe(false)
      expect(apiRoutePolicy.isPublicRoute('/api/aigate/api-key')).toBe(false)
      expect(apiRoutePolicy.isPublicRoute('/api/system-settings/menu-manage')).toBe(false)
      expect(apiRoutePolicy.isPublicRoute('/api/authentication')).toBe(false)
    })
  })

  describe('authenticated Routes', () => {
    it('should identify authenticated GET routes', () => {
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage', 'GET')).toBe(true)
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage/children', 'GET')).toBe(true)
    })

    it('should reject non-GET methods for authenticated routes', () => {
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage', 'POST')).toBe(false)
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage', 'PUT')).toBe(false)
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage', 'DELETE')).toBe(false)
    })

    it('should not classify admin or public routes as authenticated-only', () => {
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/aigate/dashboard', 'GET')).toBe(false)
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/auth/session', 'GET')).toBe(false)
      expect(apiRoutePolicy.isAuthenticatedRoute('/api/system-settings/menu-manage-extra', 'GET')).toBe(false)
    })
  })

  describe('route classification boundaries', () => {
    it('normal business routes should not be classified as public or admin-only', () => {
      expect(apiRoutePolicy.isPublicRoute('/api/aigate/dashboard')).toBe(false)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/dashboard')).toBe(false)
      expect(apiRoutePolicy.isPublicRoute('/api/aigate/billing')).toBe(false)
      expect(apiRoutePolicy.isAdminRoute('/api/aigate/billing')).toBe(false)
    })
  })
})
