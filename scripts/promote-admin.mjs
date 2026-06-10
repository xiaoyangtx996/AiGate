import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@xiaoyangtx.icu'

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#'))
    continue
  const i = t.indexOf('=')
  if (i === -1)
    continue
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const { rows } = await pool.query(
  'SELECT id, email, name, role FROM "user" WHERE email = $1',
  [ADMIN_EMAIL],
)

if (!rows.length) {
  console.error(`User not found: ${ADMIN_EMAIL}`)
  process.exit(1)
}

const user = rows[0]

await pool.query('UPDATE "user" SET role = $1, updated_at = NOW() WHERE id = $2', ['admin', user.id])

const envPath = resolve(process.cwd(), '.env')
let envText = readFileSync(envPath, 'utf8')
const key = 'BETTER_AUTH_ADMIN_USER_IDS'
const line = `${key}=${user.id}`

if (new RegExp(`^${key}=`, 'm').test(envText)) {
  envText = envText.replace(new RegExp(`^${key}=.*$`, 'm'), line)
}
else {
  envText = envText.replace(
    /(# Better Auth\r?\n)/,
    `$1${line}\n`,
  )
  if (!envText.includes(line)) {
    envText += `\n${line}\n`
  }
}

writeFileSync(envPath, envText, 'utf8')

const { rows: after } = await pool.query(
  'SELECT id, email, name, role FROM "user" WHERE id = $1',
  [user.id],
)

console.log('Promoted to admin:')
console.table(after)
console.log(`Updated ${envPath}: ${key}=${user.id}`)
console.log('Restart dev server and sign in again for changes to take effect.')

await pool.end()
