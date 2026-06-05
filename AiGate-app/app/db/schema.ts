import { relations, sql } from 'drizzle-orm'
import { boolean, foreignKey, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { user } from '../../auth-schema'

export * from '../../auth-schema'

export const targetEnum = pgEnum('target_enum', [
  '_self',
  '_blank',
])

export const methodEnum = pgEnum('method', ['GET', 'POST', 'PUT', 'DELETE'])

/**
 * @description: 菜单管理
 */
export const menu = pgTable('menu', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => ([
  index('menu_parent_idx').on(t.parentId),
  index('menu_sort_idx').on(t.parentId, t.sort),
  foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'menu_parent_fk' }).onDelete('restrict'),
]))
export const insertMenuSchema = createInsertSchema(menu).omit({ id: true, createdAt: true, updatedAt: true })
export const updateMenuSchema = createUpdateSchema(menu).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 角色管理
 */
export const role = pgTable('role', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(true).notNull(),
  sort: integer('sort').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => ([
  index('role_sort_idx').on(t.sort),
]))
export const insertRoleSchema = createInsertSchema(role).omit({ id: true, createdAt: true, updatedAt: true })
export const updateRoleSchema = createUpdateSchema(role).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 角色关联菜单
 */
export const roleMenu = pgTable('role_menu', {
  roleId: text('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  menuId: text('menu_id').notNull().references(() => menu.id, { onDelete: 'cascade' }),
  permissions: integer('permissions').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  primaryKey({ columns: [t.roleId, t.menuId] }),
  index('role_menu_role_idx').on(t.roleId),
  index('role_menu_menu_idx').on(t.menuId),
])
export const insertRoleMenuSchema = createInsertSchema(roleMenu).omit({ createdAt: true })

/**
 * @description: 用户关联角色
 */
export const userRole = pgTable('user_role', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  primaryKey({ columns: [t.userId, t.roleId] }),
  index('user_role_user_idx').on(t.userId),
  index('user_role_role_idx').on(t.roleId),
])
export const insertUserRoleSchema = createInsertSchema(userRole).omit({ createdAt: true })

/**
 * @description: 国际化
 */
export const internalization = pgTable('internalization', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  zh: text('zh'),
  en: text('en'),
  parentId: text('parent_id'),
  sort: integer('sort').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => ([
  index('internalization_parent_idx').on(t.parentId),
  index('internalization_sort_idx').on(t.parentId, t.sort),
  foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'internalization_parent_fk' }).onDelete('restrict'),
]))
export const insertInternalizationSchema = createInsertSchema(internalization).omit({ id: true, createdAt: true, updatedAt: true })
export const updateInternalizationSchema = createUpdateSchema(internalization).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 操作日志
 */
export const logs = pgTable('logs', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  ip: text('ip').notNull(),
  action: text('action').notNull(),
  method: methodEnum('method').notNull(),
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

export const organization = pgTable('organization', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  level: orgLevelEnum('level').default('company').notNull(),
  tokenLimit: integer('token_limit').default(0).notNull(),
  tokenUsed: integer('token_used').default(0).notNull(),
  resetDate: timestamp('reset_date'),
  allowedModels: jsonb('allowed_models').$type<string[]>().default([]),
  rateLimits: integer('rate_limits').default(100),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('org_parent_idx').on(t.parentId),
  foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'org_parent_fk' }).onDelete('restrict'),
])

/**
 * @description: 用户关联组织（多租户核心）
 */
export const member = pgTable('member', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('member_user_idx').on(t.userId),
  index('member_org_idx').on(t.organizationId),
  index('idx_member_user_org').on(t.userId, t.organizationId),
])
export const insertMemberSchema = createInsertSchema(member).omit({ id: true, createdAt: true })
export const insertOrgSchema = createInsertSchema(organization).omit({ id: true, createdAt: true, updatedAt: true })
export const updateOrgSchema = createUpdateSchema(organization).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 渠道管理（上游 AI 供应商代理配置）
 */
export const channelStatusEnum = pgEnum('channel_status', ['enabled', 'disabled'])
export const channelHealthEnum = pgEnum('channel_health', ['healthy', 'degraded', 'down'])

export const channel = pgTable('channel', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  vendor: text('vendor').notNull(),
  vendorTag: text('vendor_tag').notNull(),
  endpoint: text('endpoint').notNull(),
  apiKey: text('api_key'),
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
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})
export const insertChannelSchema = createInsertSchema(channel).omit({ id: true, createdAt: true, updatedAt: true })
export const updateChannelSchema = createUpdateSchema(channel).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: API 密钥管理（ag-{env}-{hex} 格式）
 */
export const apiKeyStatusEnum = pgEnum('api_key_status', ['active', 'revoked', 'expired'])

export const apiKey = pgTable('api_key', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  key: text('key').notNull().unique(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id').references(() => organization.id),
  scopes: jsonb('scopes').$type<string[]>().default(['read', 'write']),
  roleIds: jsonb('role_ids').$type<string[]>().default([]),
  env: text('env').default('PROD'),
  expiresAt: timestamp('expires_at'),
  lastUsed: timestamp('last_used'),
  status: apiKeyStatusEnum('status').default('active').notNull(),
  calls: integer('calls').default(0),
  cost: integer('cost').default(0),
  dailyLimit: integer('daily_limit'),
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('api_key_user_idx').on(t.userId),
  index('api_key_org_idx').on(t.organizationId),
  index('idx_api_key_org_status').on(t.organizationId, t.status),
])
export const insertApiKeySchema = createInsertSchema(apiKey).omit({ id: true, createdAt: true, updatedAt: true })
export const updateApiKeySchema = createUpdateSchema(apiKey).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: AI 模型注册表
 */
export const aiModel = pgTable('ai_model', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  type: text('type').default('chat').notNull(),
  contextWindow: integer('context_window').default(4096),
  inputPrice: integer('input_price').default(0),
  outputPrice: integer('output_price').default(0),
  features: jsonb('features').$type<string[]>().default([]),
  status: text('status').default('available').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
})
export const insertAiModelSchema = createInsertSchema(aiModel).omit({ id: true, createdAt: true, updatedAt: true })
export const updateAiModelSchema = createUpdateSchema(aiModel).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: MCP 工具管理（Model Context Protocol 工具集成）
 */
export const mcpTool = pgTable('mcp_tool', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').default('custom').notNull(),
  organizationId: text('organization_id').references(() => organization.id),
  config: jsonb('config').default({}),
  status: text('status').default('active').notNull(),
  healthStatus: text('health_status').default('healthy'),
  lastHealthCheck: timestamp('last_health_check'),
  usageCount: integer('usage_count').default(0),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('mcp_tool_org_idx').on(t.organizationId),
])
export const insertMcpToolSchema = createInsertSchema(mcpTool).omit({ id: true, createdAt: true, updatedAt: true })
export const updateMcpToolSchema = createUpdateSchema(mcpTool).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: Agent 智能体管理
 */
export const agent = pgTable('agent', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  organizationId: text('organization_id').references(() => organization.id),
  builtin: boolean('builtin').default(false),
  tags: jsonb('tags').$type<string[]>().default([]),
  systemPrompt: text('system_prompt'),
  model: text('model').default('gpt-4o'),
  temperature: integer('temperature').default(30),
  maxTokens: integer('max_tokens').default(4096),
  tools: jsonb('tools').$type<string[]>().default([]),
  knowledgeBases: jsonb('knowledge_bases').$type<string[]>().default([]),
  status: text('status').default('active').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('agent_org_idx').on(t.organizationId),
  index('idx_agent_org_status').on(t.organizationId, t.status),
])
export const insertAgentSchema = createInsertSchema(agent).omit({ id: true, createdAt: true, updatedAt: true })
export const updateAgentSchema = createUpdateSchema(agent).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 知识库管理
 */
export const knowledgeBase = pgTable('knowledge_base', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  description: text('description'),
  organizationId: text('organization_id').references(() => organization.id),
  embeddingModel: text('embedding_model').default('text-embedding-3-small'),
  documentCount: integer('document_count').default(0),
  size: integer('size').default(0),
  status: text('status').default('ready').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('kb_org_idx').on(t.organizationId),
])
export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBase).omit({ id: true, createdAt: true, updatedAt: true })
export const updateKnowledgeBaseSchema = createUpdateSchema(knowledgeBase).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 提示词模板管理
 */
export const prompt = pgTable('prompt', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
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
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('prompt_org_idx').on(t.organizationId),
])
export const insertPromptSchema = createInsertSchema(prompt).omit({ id: true, createdAt: true, updatedAt: true })
export const updatePromptSchema = createUpdateSchema(prompt).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 提示词版本历史
 */
export const promptVersion = pgTable('prompt_version', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  promptId: text('prompt_id').notNull().references(() => prompt.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  version: integer('version').notNull(),
  createdBy: text('created_by').references(() => user.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('prompt_version_prompt_idx').on(t.promptId),
])

/**
 * @description: 系统告警
 */
export const alertTypeEnum = pgEnum('alert_type', ['quota_warning', 'key_expiring', 'error_spike', 'rate_limit', 'system'])
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical'])

export const alert = pgTable('alert', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  type: alertTypeEnum('type').notNull(),
  severity: alertSeverityEnum('severity').default('info').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  organizationId: text('organization_id').references(() => organization.id),
  userId: text('user_id').references(() => user.id),
  resourceId: text('resource_id'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('idx_alert_org_read_created').on(t.organizationId, t.read, t.createdAt),
])

/**
 * @description: 告警规则配置
 */
export const alertRule = pgTable('alert_rule', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  type: text('type').notNull(),
  condition: jsonb('condition').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  notifyChannels: jsonb('notify_channels').$type<string[]>().default([]),
  organizationId: text('organization_id').references(() => organization.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('alert_rule_org_idx').on(t.organizationId),
])

/**
 * @description: API 调用日志（180 天留存）
 */
export const apiLog = pgTable('api_log', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
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
  cachedTokens: integer('cached_tokens').default(0),
  cost: integer('cost').default(0),
  latency: integer('latency').default(0),
  statusCode: integer('status_code').default(200),
  status: text('status').default('success').notNull(),
  errorMessage: text('error_message'),
  prompt: text('prompt'),
  response: text('response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('api_log_user_idx').on(t.userId),
  index('api_log_agent_idx').on(t.agentId),
  index('api_log_model_idx').on(t.model),
  index('api_log_created_idx').on(t.createdAt),
  index('api_log_key_date_idx').on(t.apiKeyId, t.createdAt),
  index('api_log_org_date_idx').on(t.organizationId, t.createdAt),
  index('api_log_status_date_idx').on(t.status, t.createdAt),
])
export const insertApiLogSchema = createInsertSchema(apiLog).omit({ id: true, createdAt: true })
export const updateApiLogSchema = createUpdateSchema(apiLog).omit({ id: true, createdAt: true })

/**
 * @description: 账单记录
 */
export const billingRecord = pgTable('billing_record', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  organizationId: text('organization_id').references(() => organization.id),
  period: text('period').notNull(),
  tokenUsage: integer('token_usage').default(0),
  cost: integer('cost').default(0),
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
export const document = pgTable('document', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  knowledgeBaseId: text('knowledge_base_id').notNull().references(() => knowledgeBase.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').default('text').notNull(),
  size: integer('size').default(0).notNull(),
  status: text('status').default('pending').notNull(),
  chunks: integer('chunks').default(0).notNull(),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('doc_kb_idx').on(t.knowledgeBaseId),
  index('doc_status_idx').on(t.status),
])
export const insertDocumentSchema = createInsertSchema(document).omit({ id: true, createdAt: true, updatedAt: true })
export const updateDocumentSchema = createUpdateSchema(document).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: Agent 对话会话
 */
export const conversation = pgTable('conversation', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: text('agent_id').notNull().references(() => agent.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  title: text('title'),
  status: text('status').default('active').notNull(),
  messageCount: integer('message_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('conv_agent_idx').on(t.agentId),
  index('conv_user_idx').on(t.userId),
])
export const insertConversationSchema = createInsertSchema(conversation).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 对话消息
 */
export const conversationMessage = pgTable('conversation_message', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text('conversation_id').notNull().references(() => conversation.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens').default(0),
  latency: integer('latency').default(0),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('msg_conv_idx').on(t.conversationId),
])
export const insertMessageSchema = createInsertSchema(conversationMessage).omit({ id: true, createdAt: true })

/**
 * @description: MCP 工具版本管理
 */
export const mcpToolVersion = pgTable('mcp_tool_version', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  toolId: text('tool_id').notNull().references(() => mcpTool.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  config: jsonb('config').default({}),
  changelog: text('changelog'),
  active: boolean('active').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('mcp_ver_tool_idx').on(t.toolId),
])
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
