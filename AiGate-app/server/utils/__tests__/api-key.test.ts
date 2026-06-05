import { describe, expect, it } from 'vitest'

describe('api-key utils', () => {
  it('validateApiKeyFormat should validate correct format', () => {
    const validateApiKeyFormat = (key: string) => /^ag-(dev|staging|prod)-[0-9a-f]{32}$/.test(key)
    expect(validateApiKeyFormat('ag-dev-' + 'a'.repeat(32))).toBe(true)
    expect(validateApiKeyFormat('ag-prod-' + '0'.repeat(32))).toBe(true)
    expect(validateApiKeyFormat('invalid-key')).toBe(false)
    expect(validateApiKeyFormat('ag-dev-short')).toBe(false)
  })

  it('generateApiKey should generate valid format', () => {
    const generateApiKey = (env: string = 'dev') => {
      const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
      return `ag-${env}-${hex}`
    }
    const key = generateApiKey('dev')
    expect(key).toMatch(/^ag-dev-[0-9a-f]{32}$/)
  })
})
