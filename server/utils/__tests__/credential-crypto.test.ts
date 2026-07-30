import { afterEach, describe, expect, it } from 'vitest'
import { decryptCredential, decryptCredentialIfNeeded, encryptCredential, isEncryptedCredential } from '#server/utils/credential-crypto'

const previousKey = process.env.CREDENTIAL_ENCRYPTION_KEY

afterEach(() => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = previousKey
})

describe('credential crypto', () => {
  it('encrypts and decrypts credentials', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'a'.repeat(64)

    const encrypted = encryptCredential('sk-live-secret')

    expect(encrypted).not.toBe('sk-live-secret')
    expect(isEncryptedCredential(encrypted)).toBe(true)
    expect(decryptCredential(encrypted)).toBe('sk-live-secret')
  })

  it('supports empty credential roundtrip', () => {
    process.env.CREDENTIAL_ENCRYPTION_KEY = 'b'.repeat(64)

    const encrypted = encryptCredential('')

    expect(decryptCredential(encrypted)).toBe('')
  })

  it('leaves legacy plaintext unchanged when decrypting conditionally', () => {
    expect(decryptCredentialIfNeeded('sk-plain')).toBe('sk-plain')
  })
})
