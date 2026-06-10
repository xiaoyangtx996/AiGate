import { describe, expect, it } from 'vitest'

function checkApiKeyScopes(keyRecord: { scopes?: string[] | null }, method: string): boolean {
  const scopes = keyRecord.scopes || ['read', 'write']
  if (method === 'GET' || method === 'HEAD')
    return scopes.includes('read')
  return scopes.includes('write')
}

describe('checkApiKeyScopes', () => {
  it('allows GET with read scope', () => {
    expect(checkApiKeyScopes({ scopes: ['read'] }, 'GET')).toBe(true)
  })

  it('denies POST without write scope', () => {
    expect(checkApiKeyScopes({ scopes: ['read'] }, 'POST')).toBe(false)
  })

  it('allows POST with write scope', () => {
    expect(checkApiKeyScopes({ scopes: ['write'] }, 'POST')).toBe(true)
  })

  it('defaults to read+write when scopes missing', () => {
    expect(checkApiKeyScopes({}, 'GET')).toBe(true)
    expect(checkApiKeyScopes({}, 'POST')).toBe(true)
  })
})
