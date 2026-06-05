import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = join(__dirname, '../app/db/migrations/0010_phase3_extra_indexes.sql')
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/AiGate'

const statements = readFileSync(sqlPath, 'utf8')
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'))

const pool = new pg.Pool({ connectionString })

try {
  for (const sql of statements) {
    await pool.query(sql)
    console.log('OK:', sql.split('\n')[0].slice(0, 80))
  }
  console.log('\nPhase 3 indexes applied successfully.')
}
catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
}
finally {
  await pool.end()
}
