import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'
import pg from 'pg'

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#'))
      continue
    const i = t.indexOf('=')
    if (i !== -1 && !process.env[t.slice(0, i).trim()])
      process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
}

function getCredentialKey() {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!key || !/^[\da-f]{64}$/i.test(key)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be a 32-byte hex string')
  }
  return Buffer.from(key, 'hex')
}

function isEncryptedCredential(value) {
  const parts = value.split(':')
  if (parts.length !== 3)
    return false
  return parts.every((part, index) => index === 2 || Buffer.from(part, 'base64').length > 0)
}

function encryptCredential(plaintext) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getCredentialKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), ciphertext].map(item => item.toString('base64')).join(':')
}

function decryptCredential(ciphertext) {
  const [ivText, tagText, valueText] = ciphertext.split(':')
  const decipher = createDecipheriv('aes-256-gcm', getCredentialKey(), Buffer.from(ivText, 'base64'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(valueText, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  const { rows } = await pool.query('SELECT id, api_key FROM channel_credential ORDER BY created_at')
  let updated = 0

  for (const row of rows) {
    if (isEncryptedCredential(row.api_key)) {
      decryptCredential(row.api_key)
      continue
    }
    await pool.query('UPDATE channel_credential SET api_key = $1, updated_at = NOW() WHERE id = $2', [
      encryptCredential(row.api_key),
      row.id,
    ])
    updated += 1
  }

  console.log(`Encrypted ${updated} channel credentials.`)
}
finally {
  await pool.end()
}
