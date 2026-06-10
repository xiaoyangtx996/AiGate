import { describe, expect, it } from 'vitest'
import { generateApiKey, validateApiKeyFormat } from '../api-key'

describe('api-key utils', () => {
  describe('validateApiKeyFormat', () => {
    it('should accept valid dev, staging, and prod keys', () => {
      expect(validateApiKeyFormat(`ag-dev-${'a'.repeat(32)}`)).toBe(true)
      expect(validateApiKeyFormat(`ag-staging-${'b'.repeat(32)}`)).toBe(true)
      expect(validateApiKeyFormat(`ag-prod-${'0'.repeat(32)}`)).toBe(true)
    })

    it('should reject invalid formats', () => {
      expect(validateApiKeyFormat('invalid-key')).toBe(false)
      expect(validateApiKeyFormat('ag-dev-short')).toBe(false)
      expect(validateApiKeyFormat(`ag-test-${'a'.repeat(32)}`)).toBe(false)
      expect(validateApiKeyFormat(`ag-dev-${'g'.repeat(32)}`)).toBe(false)
    })
  })

  describe('generateApiKey', () => {
    it('should generate valid dev key by default', () => {
      const key = generateApiKey()
      expect(key).toMatch(/^ag-dev-[0-9a-f]{32}$/)
      expect(validateApiKeyFormat(key)).toBe(true)
    })

    it('should generate key for specified environment', () => {
      const key = generateApiKey('prod')
      expect(key).toMatch(/^ag-prod-[0-9a-f]{32}$/)
    })

    it('should generate unique keys', () => {
      const keys = new Set<string>()
      for (let index = 0; index < 10; index++) {
        keys.add(generateApiKey())
      }
      expect(keys.size).toBe(10)
    })
  })
})
