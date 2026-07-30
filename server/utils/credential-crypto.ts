import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const algorithm = 'aes-256-gcm'
const encryptedParts = 3

function getCredentialKey() {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!key) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is required')
  }
  if (!/^[\da-f]{64}$/i.test(key)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 32-byte hex string')
  }
  return Buffer.from(key, 'hex')
}

export function isEncryptedCredential(value: string) {
  const parts = value.split(':')
  if (parts.length !== encryptedParts)
    return false
  return parts.every((part, index) => {
    try {
      return index === 2 || Buffer.from(part, 'base64').length > 0
    }
    catch {
      return false
    }
  })
}

export function encryptCredential(plaintext: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(algorithm, getCredentialKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, ciphertext].map(item => item.toString('base64')).join(':')
}

export function decryptCredential(ciphertext: string) {
  const [ivText, tagText, valueText] = ciphertext.split(':')
  if (!ivText || !tagText || valueText === undefined)
    throw new Error('Invalid encrypted credential format')

  const decipher = createDecipheriv(algorithm, getCredentialKey(), Buffer.from(ivText, 'base64'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(valueText, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

export function decryptCredentialIfNeeded(value: string) {
  return isEncryptedCredential(value) ? decryptCredential(value) : value
}
