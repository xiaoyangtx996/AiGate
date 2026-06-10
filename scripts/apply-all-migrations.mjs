/**
 * Apply the complete supplemental migration path after Drizzle migrate.
 *
 * Drizzle owns the journaled migrations in meta/_journal.json. SQL files that
 * are not safe to add to the journal retroactively are replayed here as
 * idempotent supplemental migrations so new databases do not miss tables or
 * indexes.
 */
/* eslint-disable style/arrow-parens, style/brace-style */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/AiGate'
const dryRun = process.argv.includes('--dry-run')
const lineBreakRegex = /\r?\n/

const migrationsDir = join(__dirname, '../app/db/migrations')
const supplementalMigrations = [
  {
    file: '0007_comments_and_missing_tables.sql',
    deferComments: true,
    note: 'not journaled; creates document/conversation/mcp_tool_version tables and comments',
  },
  {
    file: '0008_add_api_key_role_ids.sql',
    note: 'journaled; replayed because it is idempotent and older CI paths call this script directly',
  },
  {
    file: '0009_phase2_phase3_schema.sql',
    note: 'journaled; replayed because it is idempotent and replaces the old inline Phase 2 SQL',
  },
  {
    file: '0010_phase3_extra_indexes.sql',
    note: 'not journaled; extra performance indexes',
  },
  {
    file: '0011_quota_requests.sql',
    note: 'not journaled; quota request workflow and quota change audit',
  },
]

const requiredRelations = [
  'document',
  'conversation',
  'conversation_message',
  'mcp_tool_version',
  'prompt_version',
  'alert_rule',
  'doc_kb_idx',
  'doc_status_idx',
  'conv_agent_idx',
  'conv_user_idx',
  'msg_conv_idx',
  'mcp_ver_tool_idx',
  'prompt_version_prompt_idx',
  'alert_rule_org_idx',
  'api_log_agent_idx',
  'api_log_key_date_idx',
  'api_log_org_date_idx',
  'api_log_status_date_idx',
  'idx_member_user_org',
  'idx_api_key_org_status',
  'idx_agent_org_status',
  'idx_alert_org_read_created',
  'idx_channel_status',
  'idx_channel_priority',
  'idx_channel_status_priority',
  'idx_mcp_tool_org_status',
  'idx_ai_model_name',
  'quota_request',
  'quota_change_log',
  'quota_request_org_status_idx',
  'quota_request_requester_idx',
  'quota_request_created_idx',
  'quota_change_log_org_created_idx',
  'quota_change_log_request_idx',
]

const requiredColumns = [
  { table: 'api_key', column: 'role_ids' },
  { table: 'api_log', column: 'agent_id' },
  { table: 'quota_change_log', column: 'decision_status' },
]

function parseStatements(sql, { deferComments = false } = {}) {
  const statements = sql
    .split(lineBreakRegex)
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)

  if (!deferComments) {
    return statements
  }

  const commentStatements = statements.filter(s => s.toUpperCase().startsWith('COMMENT ON '))
  const nonCommentStatements = statements.filter(s => !s.toUpperCase().startsWith('COMMENT ON '))
  return [...nonCommentStatements, ...commentStatements]
}

const allStatements = supplementalMigrations.flatMap(migration => {
  const sql = readFileSync(join(migrationsDir, migration.file), 'utf8')
  return parseStatements(sql, migration).map(statement => ({
    file: migration.file,
    note: migration.note,
    sql: statement,
  }))
})

async function verifyRequiredDatabaseObjects(pool) {
  const missingRelations = []
  for (const relation of requiredRelations) {
    const result = await pool.query('SELECT to_regclass($1) AS relation', [relation])
    if (!result.rows[0]?.relation) {
      missingRelations.push(relation)
    }
  }

  const missingColumns = []
  for (const { table, column } of requiredColumns) {
    const result = await pool.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = $1
          AND column_name = $2
      `,
      [table, column],
    )
    if (!result.rowCount) {
      missingColumns.push(`${table}.${column}`)
    }
  }

  if (missingRelations.length || missingColumns.length) {
    const messages = []
    if (missingRelations.length) {
      messages.push(`relations: ${missingRelations.join(', ')}`)
    }
    if (missingColumns.length) {
      messages.push(`columns: ${missingColumns.join(', ')}`)
    }
    throw new Error(`Missing supplemental database objects (${messages.join('; ')})`)
  }
}

if (dryRun) {
  console.log('Dry run: supplemental migrations that would be applied after Drizzle migrate:')
  for (const migration of supplementalMigrations) {
    console.log(`- ${migration.file}: ${migration.note}`)
  }
  console.log(`\nStatements: ${allStatements.length}`)
  console.log(`Required relations checked after apply: ${requiredRelations.join(', ')}`)
  console.log(
    `Required columns checked after apply: ${requiredColumns.map(({ table, column }) => `${table}.${column}`).join(', ')}`,
  )
  process.exit(0)
}

const pool = new pg.Pool({ connectionString })

try {
  for (const { file, sql } of allStatements) {
    await pool.query(sql)
    console.log(`OK [${file}]:`, sql.split('\n')[0].slice(0, 80))
  }
  await verifyRequiredDatabaseObjects(pool)
  console.log(`\nAll supplemental migrations applied and verified (${allStatements.length} statements).`)
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
