import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const version = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
const lineBreakRegex = /\r?\n/

if (!version || !/^\d{4}/.test(version)) {
  console.error('Usage: node scripts/rollback-migration.mjs <version> [--dry-run]')
  process.exit(1)
}

const rollbacksDir = join(__dirname, '../app/db/rollbacks')
const exactPath = join(rollbacksDir, `${version}.sql`)
const prefixedFile = existsSync(rollbacksDir)
  ? readdirSync(rollbacksDir).find(file => file.startsWith(`${version}_`) && file.endsWith('.sql'))
  : null
const rollbackPath = existsSync(exactPath) ? exactPath : prefixedFile ? join(rollbacksDir, prefixedFile) : null

if (!rollbackPath) {
  console.error(`Rollback SQL not found for version: ${version}`)
  process.exit(1)
}

function parseStatements(sql) {
  return sql
    .split(lineBreakRegex)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean)
}

const statements = parseStatements(readFileSync(rollbackPath, 'utf8'))

if (dryRun) {
  console.log(`Rollback file: ${basename(rollbackPath)}`)
  console.log(`Statements: ${statements.length}`)
  for (const statement of statements) {
    console.log(`- ${statement.split('\n')[0].slice(0, 100)}`)
  }
  process.exit(0)
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/AiGate'
const pool = new pg.Pool({ connectionString })

try {
  await pool.query('BEGIN')
  for (const statement of statements) {
    await pool.query(statement)
    console.log(`OK: ${statement.split('\n')[0].slice(0, 100)}`)
  }
  await pool.query('COMMIT')
  console.log(`Rollback ${version} applied.`)
}
catch (error) {
  await pool.query('ROLLBACK')
  console.error('Rollback failed:', error.message)
  process.exit(1)
}
finally {
  await pool.end()
}
