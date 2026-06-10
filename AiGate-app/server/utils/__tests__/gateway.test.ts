import { describe, expect, it, vi } from 'vitest'

import { checkApiKeyScopes, checkIpWhitelist } from '#server/utils/gateway'

vi.mock('@/db/drizzle', () => ({
  db: {},
}))

describe('gateway utils', () => {
  it('checkIpWhitelist should allow when whitelist is empty', () => {
    expect(checkIpWhitelist({ ipWhitelist: null }, '192.168.1.1')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: [] }, '192.168.1.1')).toBe(true)
  })

  it('checkIpWhitelist should match exact IP', () => {
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1'] }, '192.168.1.1')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1'] }, '10.0.0.1')).toBe(false)
  })

  it('checkIpWhitelist should match CIDR', () => {
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.0/24'] }, '192.168.1.100')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.0/24'] }, '10.0.0.1')).toBe(false)
  })

  it('checkIpWhitelist should reject invalid CIDR prefix via matchCidr', () => {
    expect(() => checkIpWhitelist({ ipWhitelist: ['192.168.1.0/33'] }, '192.168.1.1')).toThrow('Invalid CIDR prefix length')
  })

  it('checkIpWhitelist should handle /0 and /32 CIDR', () => {
    expect(checkIpWhitelist({ ipWhitelist: ['0.0.0.0/0'] }, '1.2.3.4')).toBe(true)
    expect(checkIpWhitelist({ ipWhitelist: ['192.168.1.1/32'] }, '192.168.1.1')).toBe(true)
  })

  it('checkApiKeyScopes should allow read scope for GET', () => {
    expect(checkApiKeyScopes({ scopes: ['read'] }, 'GET')).toBe(true)
    expect(checkApiKeyScopes({ scopes: ['read'] }, 'POST')).toBe(false)
  })

  it('checkApiKeyScopes should default to read+write scopes', () => {
    expect(checkApiKeyScopes({}, 'POST')).toBe(true)
    expect(checkApiKeyScopes({}, 'HEAD')).toBe(true)
  })
})
