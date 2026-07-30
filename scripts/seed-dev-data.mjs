/**
 * Seed minimal dev data for functional testing:
 * organization, member, channel (+ credential), models, api key, api logs.
 *
 * Idempotent — safe to re-run. Use --force to replace api_log seed rows.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import pg from 'pg'

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#'))
    continue
  const i = t.indexOf('=')
  if (i === -1)
    continue
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const force = process.argv.includes('--force')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const client = await pool.connect()

const IDS = {
  org: 'org-dev-1',
  channel: 'channel-dev-openai',
  credential: 'cred-dev-openai-1',
  modelChat: 'model-dev-gpt4o-mini',
  modelEmbed: 'model-dev-embed-small',
  apiKey: 'apikey-dev-test',
}

const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'test@aigate.local'
const API_KEY_VALUE = process.env.SEED_API_KEY || 'ag-dev-0123456789abcdef0123456789abcdef'

async function upsert(sql, params) {
  await client.query(sql, params)
}

try {
  await client.query('BEGIN')

  const users = await client.query('SELECT id, email FROM "user" WHERE email = $1 LIMIT 1', [TEST_EMAIL])
  if (!users.rowCount) {
    throw new Error(`User ${TEST_EMAIL} not found. Sign in once or create the account before seeding.`)
  }
  const userId = users.rows[0].id

  await upsert(
    `INSERT INTO organization (
      id, name, parent_id, level, token_limit, token_used, rate_limits,
      tenant_status, enabled, created_at, updated_at
    ) VALUES ($1, $2, NULL, 'company', 5000000, 0, 200, 'active', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      token_limit = EXCLUDED.token_limit,
      enabled = EXCLUDED.enabled,
      updated_at = NOW()`,
    [IDS.org, 'AiGate 开发组织'],
  )

  await upsert(
    `INSERT INTO member (id, user_id, organization_id, created_at)
     VALUES ('member-dev-test', $1, $2, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [userId, IDS.org],
  )

  await upsert(
    `INSERT INTO channel (
      id, name, vendor, vendor_tag, endpoint, icon, models, priority, weight, qps,
      status, health, enabled, created_at, updated_at
    ) VALUES (
      $1, 'OpenAI Dev', 'OpenAI', 'openai', 'https://api.openai.com/v1', 'simple-icons:openai',
      $2::jsonb, 1, 100, 20, 'enabled', 'healthy', true, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      endpoint = EXCLUDED.endpoint,
      models = EXCLUDED.models,
      status = 'enabled',
      health = 'healthy',
      enabled = true,
      updated_at = NOW()`,
    [IDS.channel, JSON.stringify(['gpt-4o-mini', 'gpt-4o', 'text-embedding-3-small'])],
  )

  await upsert(
    `INSERT INTO channel_credential (
      id, channel_id, name, api_key, status, sort, created_at, updated_at
    ) VALUES ($1, $2, 'Default', $3, 'active', 0, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      api_key = EXCLUDED.api_key,
      status = 'active',
      updated_at = NOW()`,
    [IDS.credential, IDS.channel, process.env.SEED_CHANNEL_API_KEY || 'sk-dev-placeholder-replace-me'],
  )

  await upsert(
    `INSERT INTO ai_model (
      id, name, provider, type, source_channel_id, context_window, status, enabled, created_at, updated_at
    ) VALUES ($1, 'gpt-4o-mini', 'openai', 'chat', $2, 128000, 'available', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET source_channel_id = EXCLUDED.source_channel_id, enabled = true, updated_at = NOW()`,
    [IDS.modelChat, IDS.channel],
  )

  await upsert(
    `INSERT INTO ai_model (
      id, name, provider, type, source_channel_id, context_window, status, enabled, created_at, updated_at
    ) VALUES ($1, 'text-embedding-3-small', 'openai', 'embedding', $2, 8191, 'available', true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET source_channel_id = EXCLUDED.source_channel_id, enabled = true, updated_at = NOW()`,
    [IDS.modelEmbed, IDS.channel],
  )

  await upsert(
    `INSERT INTO api_key (
      id, name, key, user_id, organization_id, scopes, env, status, created_at, updated_at
    ) VALUES ($1, 'Dev Test Key', $2, $3, $4, $5::jsonb, 'DEV', 'active', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      status = 'active',
      updated_at = NOW()`,
    [IDS.apiKey, API_KEY_VALUE, userId, IDS.org, JSON.stringify(['read', 'write'])],
  )

  await client.query(
    `UPDATE knowledge_base SET organization_id = $1, embedding_model_id = $2, updated_at = NOW()
     WHERE organization_id IS NULL`,
    [IDS.org, IDS.modelEmbed],
  )
  await client.query(
    `UPDATE agent SET organization_id = $1, updated_at = NOW() WHERE organization_id IS NULL`,
    [IDS.org],
  )
  await client.query(
    `UPDATE prompt SET organization_id = $1, updated_at = NOW() WHERE organization_id IS NULL`,
    [IDS.org],
  )
  await client.query(
    `UPDATE mcp_tool SET organization_id = $1, updated_at = NOW() WHERE organization_id IS NULL`,
    [IDS.org],
  )

  const existingLogs = await client.query(
    `SELECT COUNT(*)::int AS count FROM api_log WHERE organization_id = $1 AND trace_id LIKE 'seed-%'`,
    [IDS.org],
  )
  if (force || existingLogs.rows[0].count === 0) {
    if (force) {
      await client.query(`DELETE FROM api_log WHERE organization_id = $1 AND trace_id LIKE 'seed-%'`, [IDS.org])
    }

    const models = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-haiku-latest', 'text-embedding-3-small']
    const statuses = ['success', 'success', 'success', 'error']
    const rows = []
    const now = Date.now()

    for (let day = 6; day >= 0; day -= 1) {
      for (let i = 0; i < 8; i += 1) {
        const model = models[(day + i) % models.length]
        const status = statuses[(day + i) % statuses.length]
        const inputTokens = 200 + ((day * 37 + i * 13) % 800)
        const outputTokens = status === 'success' ? 80 + ((day * 11 + i * 7) % 400) : 0
        const totalTokens = inputTokens + outputTokens
        const createdAt = new Date(now - day * 86400000 - i * 3600000)
        const traceId = `seed-${createHash('sha256').update(`${day}-${i}`).digest('hex').slice(0, 12)}`
        rows.push({
          id: `apilog-seed-${day}-${i}`,
          userId,
          apiKeyId: IDS.apiKey,
          organizationId: IDS.org,
          model,
          provider: model.includes('claude') ? 'anthropic' : 'openai',
          type: model.includes('embedding') ? 'embedding' : 'chat',
          inputTokens,
          outputTokens,
          totalTokens,
          tokensEstimated: false,
          cost: Math.round(totalTokens * 0.02),
          latency: 300 + ((day + i) % 20) * 40,
          statusCode: status === 'success' ? 200 : 502,
          status,
          errorMessage: status === 'error' ? 'upstream timeout (seed)' : null,
          traceId,
          createdAt,
        })
      }
    }

    for (const row of rows) {
      await client.query(
        `INSERT INTO api_log (
          id, user_id, api_key_id, organization_id, model, provider, type,
          input_tokens, output_tokens, total_tokens, tokens_estimated, cost, latency,
          status_code, status, error_message, trace_id, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          row.id, row.userId, row.apiKeyId, row.organizationId, row.model, row.provider, row.type,
          row.inputTokens, row.outputTokens, row.totalTokens, row.tokensEstimated, row.cost, row.latency,
          row.statusCode, row.status, row.errorMessage, row.traceId, row.createdAt,
        ],
      )
    }

    const totalUsed = rows.reduce((sum, row) => sum + row.totalTokens, 0)
    await client.query(
      `UPDATE organization SET token_used = $1, updated_at = NOW() WHERE id = $2`,
      [totalUsed, IDS.org],
    )
  }

  await client.query('COMMIT')

  const summary = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM organization WHERE id = $1) AS orgs,
      (SELECT COUNT(*)::int FROM member WHERE organization_id = $1) AS members,
      (SELECT COUNT(*)::int FROM channel) AS channels,
      (SELECT COUNT(*)::int FROM api_log WHERE organization_id = $1) AS api_logs,
      (SELECT extname FROM pg_extension WHERE extname = 'vector') AS pgvector
  `, [IDS.org])

  console.log('Dev seed complete:', summary.rows[0])
  console.log(`Organization: ${IDS.org} | Test user: ${TEST_EMAIL}`)
  console.log(`API key (dev): ${API_KEY_VALUE}`)
}
catch (err) {
  await client.query('ROLLBACK')
  console.error('Seed failed:', err.message)
  process.exitCode = 1
}
finally {
  client.release()
  await pool.end()
}
