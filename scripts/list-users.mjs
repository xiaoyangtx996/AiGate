import { readFileSync } from 'node:fs'
import pg from 'pg'

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
const { rows } = await pool.query('SELECT id, email, name, role FROM "user" ORDER BY created_at')
console.table(rows)
await pool.end()
