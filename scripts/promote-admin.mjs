import { readFileSync } from 'node:fs'
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

await pool.query('BEGIN')
try {
  await pool.query('UPDATE "user" SET role = $1, updated_at = NOW() WHERE id = $2', ['admin', user.id])
  await pool.query(
    `
    INSERT INTO role (id, name, code, description, enabled, sort, created_at, updated_at)
    VALUES ('role-super-admin', 'Super Admin', 'super_admin', 'Built-in database super administrator', true, -100, NOW(), NOW())
    ON CONFLICT (code) DO UPDATE
      SET enabled = true, updated_at = NOW()
    `,
  )
  await pool.query(
    `
    INSERT INTO user_role (user_id, role_id, created_at)
    SELECT $1, id, NOW()
    FROM role
    WHERE code = 'super_admin'
    ON CONFLICT DO NOTHING
    `,
    [user.id],
  )
  await pool.query('COMMIT')
}
catch (error) {
  await pool.query('ROLLBACK')
  throw error
}

const { rows: after } = await pool.query(
  'SELECT id, email, name, role FROM "user" WHERE id = $1',
  [user.id],
)

console.log('Promoted to admin:')
console.table(after)
console.log('Assigned DB role: super_admin')
console.log('Restart dev server and sign in again for changes to take effect.')

await pool.end()
