import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = join(__dirname, '../app/db/migrations/0010_phase3_extra_indexes.sql')
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/AiGate'
const dryRun = process.argv.includes('--dry-run')

const statements = readFileSync(sqlPath, 'utf8')
  .split(/\r?\n/)
  .filter(line => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(Boolean)

if (dryRun) {
  console.log(`Dry run: ${statements.length} Phase 3 index statements would be applied.`)
  process.exit(0)
}

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
