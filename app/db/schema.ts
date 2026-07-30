import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { user } from '../../auth-schema'

export * from '../../auth-schema'

const vector = customType<{ data: number[], driverData: string }>({
  dataType() {
    return 'vector'
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string) {
    return value
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(',')
      .map(item => Number(item))
      .filter(item => Number.isFinite(item))
  },
})

export const targetEnum = pgEnum('target_enum', ['_self', '_blank'])

export const methodEnum = pgEnum('method', ['GET', 'POST', 'PUT', 'DELETE'])

/**
 * @description: 菜单管理
 */
export const menu = pgTable(
  'menu',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text('code').unique(),
    label: text('label').notNull(),
    icon: text('icon').notNull(),
    to: text('to'),
    badge: text('badge'),
    parentId: text('parent_id'),
    sort: integer('sort').default(0).notNull(),
    keepAlive: boolean('keep_alive').default(false).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    defaultOpen: boolean('default_open').default(false).notNull(),
    target: targetEnum('target').default('_self').notNull(),
    permissions: integer('permissions').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    index('menu_parent_idx').on(t.parentId),
    index('menu_sort_idx').on(t.parentId, t.sort),
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'menu_parent_fk' }).onDelete('restrict'),
  ],
)
export const insertMenuSchema = createInsertSchema(menu).omit({ id: true, createdAt: true, updatedAt: true })
export const updateMenuSchema = createUpdateSchema(menu).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 角色管理
 */
export const role = pgTable(
  'role',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull().unique(),
    code: text('code').notNull().unique(),
    description: text('description'),
    enabled: boolean('enabled').default(true).notNull(),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('role_sort_idx').on(t.sort)],
)
export const insertRoleSchema = createInsertSchema(role).omit({ id: true, createdAt: true, updatedAt: true })
export const updateRoleSchema = createUpdateSchema(role).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 角色关联菜单
 */
export const roleMenu = pgTable(
  'role_menu',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    menuId: text('menu_id')
      .notNull()
      .references(() => menu.id, { onDelete: 'cascade' }),
    permissions: integer('permissions').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    primaryKey({ columns: [t.roleId, t.menuId] }),
    index('role_menu_role_idx').on(t.roleId),
    index('role_menu_menu_idx').on(t.menuId),
  ],
)
export const insertRoleMenuSchema = createInsertSchema(roleMenu).omit({ createdAt: true })

/**
 * @description: 用户关联角色
 */
export const userRole = pgTable(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index('user_role_user_idx').on(t.userId),
    index('user_role_role_idx').on(t.roleId),
  ],
)
export const insertUserRoleSchema = createInsertSchema(userRole).omit({ createdAt: true })

/**
 * @description: 国际化
 */
export const internalization = pgTable(
  'internalization',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    zh: text('zh'),
    en: text('en'),
    parentId: text('parent_id'),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    index('internalization_parent_idx').on(t.parentId),
    index('internalization_sort_idx').on(t.parentId, t.sort),
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'internalization_parent_fk' }).onDelete(
      'restrict',
    ),
  ],
)
export const insertInternalizationSchema = createInsertSchema(internalization).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateInternalizationSchema = createUpdateSchema(internalization).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: 操作日志
 */
export const logs = pgTable('logs', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  ip: text('ip').notNull(),
  action: text('action').notNull(),
  method: methodEnum('method').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  params: jsonb('params'),
  device: text('device').notNull(),
  os: text('os').notNull(),
  browser: text('browser').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ==================== Relations ====================

export const roleRelations = relations(role, ({ many }) => ({
  menus: many(roleMenu),
  users: many(userRole),
}))

export const roleMenuRelations = relations(roleMenu, ({ one }) => ({
  role: one(role, { fields: [roleMenu.roleId], references: [role.id] }),
  menu: one(menu, { fields: [roleMenu.menuId], references: [menu.id] }),
}))

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, { fields: [userRole.userId], references: [user.id] }),
  role: one(role, { fields: [userRole.roleId], references: [role.id] }),
}))

export const logsRelations = relations(logs, ({ one }) => ({
  user: one(user, { fields: [logs.userId], references: [user.id] }),
}))

// ==================== AiGate 业务表 ====================

/**
 * @description: 组织管理（四级：集团 → 分公司 → 部门 → 团队）
 */
export const orgLevelEnum = pgEnum('org_level', ['group', 'company', 'department', 'team'])

export const organization = pgTable(
  'organization',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    level: orgLevelEnum('level').default('company').notNull(),
    tokenLimit: integer('token_limit').default(0).notNull(),
    tokenUsed: integer('token_used').default(0).notNull(),
    costUsed: numeric('cost_used', { precision: 18, scale: 8, mode: 'number' }).default(0).notNull(),
    resetDate: timestamp('reset_date'),
    allowedModels: jsonb('allowed_models').$type<string[]>().default([]),
    rateLimits: integer('rate_limits').default(100),
    packageId: text('package_id'),
    expireTime: timestamp('expire_time'),
    accountLimit: integer('account_limit').default(-1).notNull(),
    tenantStatus: text('tenant_status').default('active').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    index('org_parent_idx').on(t.parentId),
    foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'org_parent_fk' }).onDelete('restrict'),
  ],
)

export const systemSettingScopeEnum = pgEnum('system_setting_scope', ['global', 'org'])

export const systemSetting = pgTable(
  'system_setting',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    scope: systemSettingScopeEnum('scope').default('global').notNull(),
    organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').notNull(),
    updatedBy: text('updated_by').references(() => user.id),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    uniqueIndex('system_setting_scope_org_key_idx').on(t.scope, t.organizationId, t.key),
    index('system_setting_key_idx').on(t.key),
  ],
)
export const insertSystemSettingSchema = createInsertSchema(systemSetting).omit({ id: true, updatedAt: true })
export const updateSystemSettingSchema = createUpdateSchema(systemSetting).omit({ id: true, updatedAt: true })

export const tenantPackage = pgTable(
  'tenant_package',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    description: text('description'),
    menuCodes: jsonb('menu_codes').$type<string[]>().default([]).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('tenant_package_enabled_idx').on(t.enabled), index('tenant_package_sort_idx').on(t.sort)],
)
export const insertTenantPackageSchema = createInsertSchema(tenantPackage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateTenantPackageSchema = createUpdateSchema(tenantPackage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: 用户关联组织（多租户核心）
 */
export const member = pgTable(
  'member',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    index('member_user_idx').on(t.userId),
    index('member_org_idx').on(t.organizationId),
    index('idx_member_user_org').on(t.userId, t.organizationId),
  ],
)
export const insertMemberSchema = createInsertSchema(member).omit({ id: true, createdAt: true })
export const insertOrgSchema = createInsertSchema(organization).omit({ id: true, createdAt: true, updatedAt: true })
export const updateOrgSchema = createUpdateSchema(organization).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 配额申请与变更审计
 */
export const quotaRequest = pgTable(
  'quota_request',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestedTokenLimit: integer('requested_token_limit').notNull(),
    currentTokenLimit: integer('current_token_limit').default(0).notNull(),
    reason: text('reason'),
    status: text('status').$type<'pending' | 'approved' | 'rejected'>().default('pending').notNull(),
    approverId: text('approver_id').references(() => user.id),
    decisionComment: text('decision_comment'),
    decidedAt: timestamp('decided_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    index('quota_request_org_status_idx').on(t.organizationId, t.status),
    index('quota_request_requester_idx').on(t.requesterId),
    index('quota_request_created_idx').on(t.createdAt),
  ],
)

export const quotaChangeLog = pgTable(
  'quota_change_log',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    requestId: text('request_id').references(() => quotaRequest.id, { onDelete: 'set null' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    previousTokenLimit: integer('previous_token_limit').notNull(),
    nextTokenLimit: integer('next_token_limit').notNull(),
    decisionStatus: text('decision_status').$type<'approved' | 'rejected'>(),
    reason: text('reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    index('quota_change_log_org_created_idx').on(t.organizationId, t.createdAt),
    index('quota_change_log_request_idx').on(t.requestId),
  ],
)

/**
 * @description: 渠道管理（上游 AI 供应商代理配置）
 */
export const channelStatusEnum = pgEnum('channel_status', ['enabled', 'disabled'])
export const channelHealthEnum = pgEnum('channel_health', ['healthy', 'degraded', 'down'])
export const channelCredentialStatusEnum = pgEnum('channel_credential_status', [
  'active',
  'disabled',
  'exhausted',
  'error',
])

export const channel = pgTable('channel', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  vendor: text('vendor').notNull(),
  vendorTag: text('vendor_tag').notNull(),
  endpoint: text('endpoint').notNull(),
  icon: text('icon'),
  models: jsonb('models').$type<string[]>().default([]),
  priority: integer('priority').default(1).notNull(),
  weight: integer('weight').default(100).notNull(),
  qps: integer('qps').default(10).notNull(),
  status: channelStatusEnum('status').default('enabled').notNull(),
  health: channelHealthEnum('health').default('healthy').notNull(),
  rateLimitQps: integer('rate_limit_qps').default(10),
  rateLimitTpm: integer('rate_limit_tpm').default(50000),
  rateLimitRpm: integer('rate_limit_rpm').default(1000),
  rateLimitStrategy: text('rate_limit_strategy').default('queue'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
export const insertChannelSchema = createInsertSchema(channel).omit({ id: true, createdAt: true, updatedAt: true })
export const updateChannelSchema = createUpdateSchema(channel).omit({ id: true, createdAt: true, updatedAt: true })

export const channelCredential = pgTable(
  'channel_credential',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    channelId: text('channel_id')
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    apiKey: text('api_key').notNull(),
    status: channelCredentialStatusEnum('status').default('active').notNull(),
    cooldownUntil: timestamp('cooldown_until'),
    lastCheckedAt: timestamp('last_checked_at'),
    lastError: text('last_error'),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('channel_credential_channel_idx').on(t.channelId), index('channel_credential_status_idx').on(t.status)],
)
export const insertChannelCredentialSchema = createInsertSchema(channelCredential).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateChannelCredentialSchema = createUpdateSchema(channelCredential).omit({
  id: true,
  channelId: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: API 密钥管理（ag-{env}-{hex} 格式）
 */
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired', 'disabled'])

export const apiKey = pgTable(
  'api_key',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organization.id),
    scopes: jsonb('scopes').$type<string[]>().default(['read', 'write']),
    roleIds: jsonb('role_ids').$type<string[]>().default([]),
    env: text('env').default('PROD'),
    expiresAt: timestamp('expires_at'),
    lastUsed: timestamp('last_used'),
    status: apiKeyStatusEnum('status').default('active').notNull(),
    calls: integer('calls').default(0),
    cost: numeric('cost', { precision: 18, scale: 8, mode: 'number' }).default(0),
    dailyLimit: integer('daily_limit'),
    ipWhitelist: jsonb('ip_whitelist').$type<string[]>().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    index('api_key_user_idx').on(t.userId),
    index('api_key_org_idx').on(t.organizationId),
    index('idx_api_key_org_status').on(t.organizationId, t.status),
  ],
)
export const insertApiKeySchema = createInsertSchema(apiKey).omit({ id: true, createdAt: true, updatedAt: true })
export const updateApiKeySchema = createUpdateSchema(apiKey).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: AI 模型注册表
 */
export const aiModel = pgTable('ai_model', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  type: text('type').default('chat').notNull(),
  sourceChannelId: text('source_channel_id').references(() => channel.id, { onDelete: 'set null' }),
  contextWindow: integer('context_window').default(4096),
  inputPrice: numeric('input_price', { precision: 18, scale: 8, mode: 'number' }).default(0),
  outputPrice: numeric('output_price', { precision: 18, scale: 8, mode: 'number' }).default(0),
  features: jsonb('features').$type<string[]>().default([]),
  status: text('status').default('available').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
export const insertAiModelSchema = createInsertSchema(aiModel).omit({ id: true, createdAt: true, updatedAt: true })
export const updateAiModelSchema = createUpdateSchema(aiModel).omit({ id: true, createdAt: true, updatedAt: true })

export const modelCombo = pgTable(
  'model_combo',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('model_combo_org_idx').on(t.organizationId), index('model_combo_name_idx').on(t.organizationId, t.name)],
)

export const modelComboItem = pgTable(
  'model_combo_item',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    comboId: text('combo_id')
      .notNull()
      .references(() => modelCombo.id, { onDelete: 'cascade' }),
    sort: integer('sort').default(0).notNull(),
    channelId: text('channel_id')
      .notNull()
      .references(() => channel.id, { onDelete: 'cascade' }),
    modelName: text('model_name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index('model_combo_item_combo_idx').on(t.comboId), index('model_combo_item_channel_idx').on(t.channelId)],
)
export const insertModelComboSchema = createInsertSchema(modelCombo).omit({ id: true, createdAt: true, updatedAt: true })
export const updateModelComboSchema = createUpdateSchema(modelCombo).omit({ id: true, createdAt: true, updatedAt: true })
export const insertModelComboItemSchema = createInsertSchema(modelComboItem).omit({ id: true, createdAt: true })

/**
 * @description: MCP 工具管理（Model Context Protocol 工具集成）
 */
export const mcpTool = pgTable(
  'mcp_tool',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    description: text('description'),
    type: text('type').default('custom').notNull(),
    organizationId: text('organization_id').references(() => organization.id),
    config: jsonb('config').default({}),
    transportType: text('transport_type').default('sse').notNull(),
    command: text('command'),
    args: jsonb('args').$type<string[]>().default([]),
    env: jsonb('env').$type<Record<string, string>>().default({}),
    serverUrl: text('server_url'),
    authType: text('auth_type').default('none').notNull(),
    authConfig: jsonb('auth_config').$type<Record<string, string>>().default({}),
    connectionStatus: text('connection_status').default('unknown').notNull(),
    lastConnectedAt: timestamp('last_connected_at'),
    lastError: text('last_error'),
    category: text('category'),
    icon: text('icon'),
    sourceSlug: text('source_slug'),
    securityScore: jsonb('security_score').$type<Record<string, unknown>>(),
    status: text('status').default('active').notNull(),
    healthStatus: text('health_status').default('healthy'),
    lastHealthCheck: timestamp('last_health_check'),
    usageCount: integer('usage_count').default(0),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('mcp_tool_org_idx').on(t.organizationId)],
)
export const insertMcpToolSchema = createInsertSchema(mcpTool).omit({ id: true, createdAt: true, updatedAt: true })
export const updateMcpToolSchema = createUpdateSchema(mcpTool).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: Agent 智能体管理
 */
export const agent = pgTable(
  'agent',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    description: text('description'),
    organizationId: text('organization_id').references(() => organization.id),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    builtin: boolean('builtin').default(false),
    tags: jsonb('tags').$type<string[]>().default([]),
    systemPrompt: text('system_prompt'),
    model: text('model').default('gpt-4o'),
    temperature: integer('temperature').default(30),
    maxTokens: integer('max_tokens').default(4096),
    tools: jsonb('tools').$type<string[]>().default([]),
    knowledgeBases: jsonb('knowledge_bases').$type<string[]>().default([]),
    memoryEnabled: boolean('memory_enabled').default(true).notNull(),
    mcpEnabled: boolean('mcp_enabled').default(false).notNull(),
    skillEnabled: boolean('skill_enabled').default(false).notNull(),
    ragEnabled: boolean('rag_enabled').default(false).notNull(),
    ragCallMode: text('rag_call_mode').default('auto').notNull(),
    shortTermMemorySize: integer('short_term_memory_size').default(10).notNull(),
    status: text('status').default('active').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    index('agent_org_idx').on(t.organizationId),
    index('idx_agent_org_status').on(t.organizationId, t.status),
    index('agent_owner_idx').on(t.ownerId),
  ],
)
export const insertAgentSchema = createInsertSchema(agent).omit({ id: true, createdAt: true, updatedAt: true })
export const updateAgentSchema = createUpdateSchema(agent).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 知识库管理
 */
export const storageInstance = pgTable(
  'storage_instance',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    category: text('category').default('vector').notNull(),
    type: text('type').default('pgvector').notNull(),
    config: jsonb('config').$type<Record<string, unknown>>().default({}),
    isDefault: boolean('is_default').default(false).notNull(),
    status: text('status').default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('storage_instance_type_idx').on(t.type), index('storage_instance_default_idx').on(t.isDefault)],
)
export const insertStorageInstanceSchema = createInsertSchema(storageInstance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateStorageInstanceSchema = createUpdateSchema(storageInstance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const knowledgeBase = pgTable(
  'knowledge_base',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    description: text('description'),
    organizationId: text('organization_id').references(() => organization.id),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'set null' }),
    embeddingModel: text('embedding_model').default('text-embedding-3-small'),
    storageInstanceId: text('storage_instance_id').references(() => storageInstance.id, { onDelete: 'set null' }),
    embeddingModelId: text('embedding_model_id').references(() => aiModel.id, { onDelete: 'set null' }),
    embeddingDim: integer('embedding_dim').default(1536),
    rerankModelId: text('rerank_model_id').references(() => aiModel.id, { onDelete: 'set null' }),
    chunkSize: integer('chunk_size').default(1000).notNull(),
    chunkOverlap: integer('chunk_overlap').default(200).notNull(),
    topK: integer('top_k').default(5).notNull(),
    dedupStrategy: text('dedup_strategy').default('reject').notNull(),
    documentCount: integer('document_count').default(0),
    size: integer('size').default(0),
    status: text('status').default('ready').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('kb_org_idx').on(t.organizationId), index('kb_owner_idx').on(t.ownerId)],
)
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateKnowledgeBaseSchema = createUpdateSchema(knowledgeBase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: 提示词模板管理
 */
export const prompt = pgTable(
  'prompt',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    description: text('description'),
    content: text('content').notNull(),
    category: text('category').default('general').notNull(),
    variables: jsonb('variables').$type<string[]>().default([]),
    organizationId: text('organization_id').references(() => organization.id),
    usageCount: integer('usage_count').default(0),
    createdBy: text('created_by').references(() => user.id),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('prompt_org_idx').on(t.organizationId)],
)
export const insertPromptSchema = createInsertSchema(prompt).omit({ id: true, createdAt: true, updatedAt: true })
export const updatePromptSchema = createUpdateSchema(prompt).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 提示词版本历史
 */
export const promptVersion = pgTable(
  'prompt_version',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    promptId: text('prompt_id')
      .notNull()
      .references(() => prompt.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    version: integer('version').notNull(),
    createdBy: text('created_by').references(() => user.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index('prompt_version_prompt_idx').on(t.promptId)],
)

/**
 * @description: 系统告警
 */
export const alertTypeEnum = pgEnum('alert_type', [
  'quota_warning',
  'key_expiring',
  'key_expired',
  'tenant_expiring',
  'error_spike',
  'rate_limit',
  'mcp_unavailable',
  'knowledge_storage',
  'agent_error',
  'channel_down',
  'credential_exhausted',
  'cost_spike',
  'system',
])
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical'])
export const alertStatusEnum = pgEnum('alert_status', ['open', 'acknowledged', 'resolved'])

export const alert = pgTable(
  'alert',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: alertTypeEnum('type').notNull(),
    severity: alertSeverityEnum('severity').default('info').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    organizationId: text('organization_id').references(() => organization.id),
    userId: text('user_id').references(() => user.id),
    resourceId: text('resource_id'),
    read: boolean('read').default(false).notNull(),
    status: alertStatusEnum('status').default('open').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    index('idx_alert_org_read_created').on(t.organizationId, t.read, t.createdAt),
    index('idx_alert_org_status_created').on(t.organizationId, t.status, t.createdAt),
  ],
)

/**
 * @description: 告警规则配置
 */
export const alertRule = pgTable(
  'alert_rule',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    type: text('type').notNull(),
    condition: jsonb('condition').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    notifyChannels: jsonb('notify_channels').$type<string[]>().default([]),
    organizationId: text('organization_id').references(() => organization.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index('alert_rule_org_idx').on(t.organizationId)],
)

export const userNotificationPref = pgTable(
  'user_notification_pref',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    alertType: text('alert_type').notNull(),
    channels: jsonb('channels').$type<string[]>().default(['in_app']).notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [
    primaryKey({ columns: [t.userId, t.alertType] }),
    index('user_notification_pref_user_idx').on(t.userId),
  ],
)

/**
 * @description: API 调用日志（180 天留存）
 */
export const apiLog = pgTable(
  'api_log',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text('user_id').references(() => user.id),
    apiKeyId: text('api_key_id').references(() => apiKey.id),
    agentId: text('agent_id').references(() => agent.id),
    organizationId: text('organization_id').references(() => organization.id),
    model: text('model').notNull(),
    provider: text('provider'),
    type: text('type').default('chat'),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    totalTokens: integer('total_tokens').default(0),
    tokensEstimated: boolean('tokens_estimated').default(false).notNull(),
    cachedTokens: integer('cached_tokens').default(0),
    cost: numeric('cost', { precision: 18, scale: 8, mode: 'number' }).default(0),
    latency: integer('latency').default(0),
    statusCode: integer('status_code').default(200),
    status: text('status').default('success').notNull(),
    errorMessage: text('error_message'),
    prompt: text('prompt'),
    response: text('response'),
    traceId: text('trace_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    index('api_log_user_idx').on(t.userId),
    index('api_log_agent_idx').on(t.agentId),
    index('api_log_model_idx').on(t.model),
    index('api_log_created_idx').on(t.createdAt),
    index('api_log_key_date_idx').on(t.apiKeyId, t.createdAt),
    index('api_log_org_date_idx').on(t.organizationId, t.createdAt),
    index('api_log_status_date_idx').on(t.status, t.createdAt),
    index('api_log_trace_id_idx').on(t.traceId),
  ],
)
export const insertApiLogSchema = createInsertSchema(apiLog).omit({ id: true, createdAt: true })
export const updateApiLogSchema = createUpdateSchema(apiLog).omit({ id: true, createdAt: true })

/**
 * @description: 账单记录
 */
export const billingRecord = pgTable('billing_record', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  organizationId: text('organization_id').references(() => organization.id),
  period: text('period').notNull(),
  tokenUsage: integer('token_usage').default(0),
  cost: numeric('cost', { precision: 18, scale: 8, mode: 'number' }).default(0),
  status: text('status').default('pending').notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
export const insertBillingSchema = createInsertSchema(billingRecord).omit({ id: true, createdAt: true })
export const updateBillingSchema = createUpdateSchema(billingRecord).omit({ id: true, createdAt: true })

// ==================== 缺失表补充 ====================

/**
 * @description: 知识库文档（文档上传、解析、向量化）
 */
export const document = pgTable(
  'document',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').default('text').notNull(),
    size: integer('size').default(0).notNull(),
    path: text('path'),
    status: text('status').default('uploaded').notNull(),
    chunks: integer('chunks').default(0).notNull(),
    chunkCount: integer('chunk_count').default(0).notNull(),
    tokenCount: integer('token_count').default(0).notNull(),
    contentHash: text('content_hash'),
    errorMsg: text('error_msg'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('doc_kb_idx').on(t.knowledgeBaseId), index('doc_status_idx').on(t.status)],
)
export const insertDocumentSchema = createInsertSchema(document).omit({ id: true, createdAt: true, updatedAt: true })
export const updateDocumentSchema = createUpdateSchema(document).omit({ id: true, createdAt: true, updatedAt: true })

export const documentChunk = pgTable(
  'document_chunk',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    documentId: text('document_id')
      .notNull()
      .references(() => document.id, { onDelete: 'cascade' }),
    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    sort: integer('sort').default(0).notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').default(0).notNull(),
    contentHash: text('content_hash'),
    embedding: vector('embedding'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    index('document_chunk_document_idx').on(t.documentId),
    index('document_chunk_kb_idx').on(t.knowledgeBaseId),
    index('document_chunk_hash_idx').on(t.contentHash),
  ],
)
export const insertDocumentChunkSchema = createInsertSchema(documentChunk).omit({ id: true, createdAt: true })
export const updateDocumentChunkSchema = createUpdateSchema(documentChunk).omit({ id: true, createdAt: true })

export const skill = pgTable(
  'skill',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    content: text('content').notNull(),
    version: integer('version').default(1).notNull(),
    hasFiles: boolean('has_files').default(false).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('skill_org_idx').on(t.organizationId), index('skill_enabled_idx').on(t.enabled)],
)
export const insertSkillSchema = createInsertSchema(skill).omit({ id: true, createdAt: true, updatedAt: true })
export const updateSkillSchema = createUpdateSchema(skill).omit({ id: true, createdAt: true, updatedAt: true })

export const skillFile = pgTable(
  'skill_file',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    skillId: text('skill_id')
      .notNull()
      .references(() => skill.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('skill_file_skill_idx').on(t.skillId), index('skill_file_path_idx').on(t.skillId, t.path)],
)
export const insertSkillFileSchema = createInsertSchema(skillFile).omit({ id: true, createdAt: true, updatedAt: true })
export const updateSkillFileSchema = createUpdateSchema(skillFile).omit({ id: true, createdAt: true, updatedAt: true })

export const agentKnowledgeBase = pgTable(
  'agent_knowledge_base',
  {
    agentId: text('agent_id')
      .notNull()
      .references(() => agent.id, { onDelete: 'cascade' }),
    knowledgeBaseId: text('knowledge_base_id')
      .notNull()
      .references(() => knowledgeBase.id, { onDelete: 'cascade' }),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    primaryKey({ columns: [t.agentId, t.knowledgeBaseId] }),
    index('agent_kb_agent_idx').on(t.agentId),
    index('agent_kb_kb_idx').on(t.knowledgeBaseId),
  ],
)

export const agentMcpTool = pgTable(
  'agent_mcp_tool',
  {
    agentId: text('agent_id')
      .notNull()
      .references(() => agent.id, { onDelete: 'cascade' }),
    toolId: text('tool_id')
      .notNull()
      .references(() => mcpTool.id, { onDelete: 'cascade' }),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    primaryKey({ columns: [t.agentId, t.toolId] }),
    index('agent_mcp_agent_idx').on(t.agentId),
    index('agent_mcp_tool_idx').on(t.toolId),
  ],
)

export const agentSkill = pgTable(
  'agent_skill',
  {
    agentId: text('agent_id')
      .notNull()
      .references(() => agent.id, { onDelete: 'cascade' }),
    skillId: text('skill_id')
      .notNull()
      .references(() => skill.id, { onDelete: 'cascade' }),
    sort: integer('sort').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [
    primaryKey({ columns: [t.agentId, t.skillId] }),
    index('agent_skill_agent_idx').on(t.agentId),
    index('agent_skill_skill_idx').on(t.skillId),
  ],
)

/**
 * @description: Agent 对话会话
 */
export const conversation = pgTable(
  'conversation',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    agentId: text('agent_id').references(() => agent.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title'),
    type: text('type').default('agent').notNull(),
    status: text('status').default('active').notNull(),
    messageCount: integer('message_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  t => [index('conv_agent_idx').on(t.agentId), index('conv_user_idx').on(t.userId), index('conv_type_user_idx').on(t.type, t.userId)],
)
export const insertConversationSchema = createInsertSchema(conversation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: 对话消息
 */
export const conversationMessage = pgTable(
  'conversation_message',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokens: integer('tokens').default(0),
    latency: integer('latency').default(0),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index('msg_conv_idx').on(t.conversationId)],
)
export const insertMessageSchema = createInsertSchema(conversationMessage).omit({ id: true, createdAt: true })

/**
 * @description: MCP 工具版本管理
 */
export const mcpToolVersion = pgTable(
  'mcp_tool_version',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    toolId: text('tool_id')
      .notNull()
      .references(() => mcpTool.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    config: jsonb('config').default({}),
    changelog: text('changelog'),
    active: boolean('active').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  t => [index('mcp_ver_tool_idx').on(t.toolId)],
)
export const insertMcpVersionSchema = createInsertSchema(mcpToolVersion).omit({ id: true, createdAt: true })

// ==================== 新增表关联 ====================

export const documentRelations = relations(document, ({ one }) => ({
  knowledgeBase: one(knowledgeBase, { fields: [document.knowledgeBaseId], references: [knowledgeBase.id] }),
}))

export const conversationRelations = relations(conversation, ({ one, many }) => ({
  agent: one(agent, { fields: [conversation.agentId], references: [agent.id] }),
  messages: many(conversationMessage),
}))

export const conversationMessageRelations = relations(conversationMessage, ({ one }) => ({
  conversation: one(conversation, { fields: [conversationMessage.conversationId], references: [conversation.id] }),
}))

export const mcpToolVersionRelations = relations(mcpToolVersion, ({ one }) => ({
  tool: one(mcpTool, { fields: [mcpToolVersion.toolId], references: [mcpTool.id] }),
}))
