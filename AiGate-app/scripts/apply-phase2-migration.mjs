import pg from 'pg'

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/AiGate'

const statements = [
  `CREATE TABLE IF NOT EXISTS prompt_version (
    id text PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id text NOT NULL REFERENCES prompt(id) ON DELETE CASCADE,
    content text NOT NULL,
    version integer NOT NULL,
    created_by text REFERENCES "user"(id),
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS prompt_version_prompt_idx ON prompt_version(prompt_id)`,
  `CREATE TABLE IF NOT EXISTS alert_rule (
    id text PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL,
    condition jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    notify_channels jsonb DEFAULT '[]',
    organization_id text REFERENCES organization(id),
    created_at timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS alert_rule_org_idx ON alert_rule(organization_id)`,
  `ALTER TABLE api_log ADD COLUMN IF NOT EXISTS agent_id text REFERENCES agent(id)`,
  `CREATE INDEX IF NOT EXISTS api_log_agent_idx ON api_log(agent_id)`,
  `CREATE INDEX IF NOT EXISTS api_log_key_date_idx ON api_log(api_key_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS api_log_org_date_idx ON api_log(organization_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS api_log_status_date_idx ON api_log(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_member_user_org ON member(user_id, organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_api_key_org_status ON api_key(organization_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_org_status ON agent(organization_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_alert_org_read_created ON alert(organization_id, read, created_at)`,
]

const pool = new pg.Pool({ connectionString })

try {
  for (const sql of statements) {
    await pool.query(sql)
    console.log('OK:', sql.split('\n')[0].slice(0, 80))
  }
  console.log('\nMigration completed successfully.')
}
catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
}
finally {
  await pool.end()
}
