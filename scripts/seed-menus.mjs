import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const envPath = resolve(process.cwd(), '.env')
try {
  const env = readFileSync(envPath, 'utf8')
  for (const line of env.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#'))
      continue
    const eq = trimmed.indexOf('=')
    if (eq === -1)
      continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\'')))
      val = val.slice(1, -1)
    if (!process.env[key])
      process.env[key] = val
  }
}
catch {
  console.warn('No .env file found, using existing env vars')
}

const menus = [
  ['menu-aigate', 'AiGate', 'lucide:cpu', null, null, 10, true, true],
  ['menu-aigate-dashboard', '仪表盘', 'lucide:gauge', '/aigate/dashboard', 'menu-aigate', 1, false, true],
  ['menu-aigate-dashboard-org', '组织视图', 'lucide:building-2', '/aigate/dashboard/organization', 'menu-aigate', 2, false, true],
  ['menu-aigate-agents', 'Agent', 'lucide:bot', '/aigate/agents', 'menu-aigate', 3, false, true],
  ['menu-aigate-channels', '渠道管理', 'lucide:route', '/aigate/channels', 'menu-aigate', 4, false, true],
  ['menu-aigate-api-keys', 'API Key', 'lucide:key-round', '/aigate/api-keys', 'menu-aigate', 5, false, true],
  ['menu-aigate-api-logs', 'API 日志', 'lucide:scroll-text', '/aigate/api-logs', 'menu-aigate', 6, false, true],
  ['menu-aigate-models', '模型管理', 'lucide:boxes', '/aigate/models', 'menu-aigate', 7, false, true],
  ['menu-aigate-mcp', 'MCP 工具', 'lucide:wrench', '/aigate/mcp-tools', 'menu-aigate', 8, false, true],
  ['menu-aigate-kb', '知识库', 'lucide:library-big', '/aigate/knowledge-base', 'menu-aigate', 9, false, true],
  ['menu-aigate-prompts', '提示词', 'lucide:message-square-text', '/aigate/prompts', 'menu-aigate', 10, false, true],
  ['menu-aigate-alerts', '告警中心', 'lucide:bell', '/aigate/alerts', 'menu-aigate', 11, false, true],
  ['menu-aigate-billing', '账单', 'lucide:receipt', '/aigate/billing', 'menu-aigate', 12, false, true],
  ['menu-aigate-orgs', '组织管理', 'lucide:network', '/aigate/organizations', 'menu-aigate', 13, false, true],
  ['menu-aigate-members', '成员管理', 'lucide:users', '/aigate/members', 'menu-aigate', 14, false, true],
  ['menu-settings', '系统设置', 'lucide:settings', null, null, 20, false, true],
  ['menu-settings-users', '用户管理', 'lucide:user-cog', '/system-settings/user-manage', 'menu-settings', 1, false, true],
  ['menu-settings-menus', '菜单管理', 'lucide:menu', '/system-settings/menu-manage', 'menu-settings', 2, false, true],
  ['menu-settings-roles', '角色管理', 'lucide:shield', '/system-settings/role-manage', 'menu-settings', 3, false, true],
  ['menu-settings-i18n', '国际化', 'lucide:languages', '/system-settings/internalization', 'menu-settings', 4, false, true],
  ['menu-settings-logs', '操作日志', 'lucide:history', '/system-settings/operation-log', 'menu-settings', 5, false, true],
  ['menu-api-docs', 'API 文档', 'lucide:book-open-text', '/docs/api', null, 95, false, true],
]

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

try {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM menu')
  if (rows[0].count > 0) {
    console.log(`Menu table already has ${rows[0].count} rows, skipping seed.`)
    process.exit(0)
  }

  for (const [id, label, icon, to, parentId, sort, defaultOpen, enabled] of menus) {
    await pool.query(
      `INSERT INTO menu (id, label, icon, "to", parent_id, sort, default_open, enabled, keep_alive, target, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, '_self', 0)`,
      [id, label, icon, to, parentId, sort, defaultOpen, enabled],
    )
  }
  console.log(`Seeded ${menus.length} menu records.`)
}
finally {
  await pool.end()
}
