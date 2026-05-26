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
  // i18n key: pages.title
  label: text('label').notNull(),
  // icon: lucide:monitor
  icon: text('icon').notNull(),
  // route path: /
  to: text('to'),
  // badge: New
  badge: text('badge'),
  // 树形结构关键字段
  parentId: text('parent_id'),
  // 排序
  sort: integer('sort').default(0).notNull(),
  // 是否缓存
  keepAlive: boolean('keep_alive').default(false).notNull(),
  // 是否启用
  enabled: boolean('enabled').default(true).notNull(),
  // 是否默认打开
  defaultOpen: boolean('default_open').default(false).notNull(),
  // 是否新窗口打开
  target: targetEnum('target').default('_self').notNull(),
  // 按钮权限位?  permissions: integer('permissions').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, t => ([
  index('menu_parent_idx').on(t.parentId),
  index('menu_sort_idx').on(t.parentId, t.sort),
  // --- 显式定义外键约束（推荐，确保数据库层面的一致性） ---
  foreignKey({
    columns: [t.parentId],
    foreignColumns: [t.id],
    name: 'menu_parent_fk', // 约束名称
  }).onDelete('restrict'),
]))
export const insertMenuSchema = createInsertSchema(menu).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateMenuSchema = createUpdateSchema(menu).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: 角色管理
 */
export const role = pgTable('role', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull().unique(),
  code: text('code').notNull().unique(),
  description: text('description'),
  // 是否启用
  enabled: boolean('enabled').default(true).notNull(),
  // 排序
  sort: integer('sort').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, t => ([
  index('role_sort_idx').on(t.sort),
]))
export const insertRoleSchema = createInsertSchema(role).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export const updateRoleSchema = createUpdateSchema(role).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

/**
 * @description: 角色关联菜单
 */
export const roleMenu = pgTable('role_menu', {
  roleId: text('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  menuId: text('menu_id').notNull().references(() => menu.id, { onDelete: 'cascade' }),
  permissions: integer('permissions').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  primaryKey({
    columns: [t.roleId, t.menuId],
  }),
  index('role_menu_role_idx').on(t.roleId),
  index('role_menu_menu_idx').on(t.menuId),
])
export const insertRoleMenuSchema = createInsertSchema(roleMenu).omit({
  createdAt: true,
})

/**
 * @description: 用户关联角色
 */
export const userRole = pgTable('user_role', {
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => role.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  primaryKey({
    columns: [t.userId, t.roleId],
  }),
  index('user_role_user_idx').on(t.userId),
  index('user_role_role_idx').on(t.roleId),
])

export const insertUserRoleSchema = createInsertSchema(userRole).omit({
  createdAt: true,
})

/**
 * @description: 国际化? */
export const internalization = pgTable('internalization', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  // 涓枃
  zh: text('zh'),
  // 英文
  en: text('en'),
  // 树形结构关键字段
  parentId: text('parent_id'),
  // 排序
  sort: integer('sort').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, t => ([
  index('internalization_parent_idx').on(t.parentId),
  index('internalization_sort_idx').on(t.parentId, t.sort),
  // --- 显式定义外键约束（推荐，确保数据库层面的一致性） ---
  foreignKey({
    columns: [t.parentId],
    foreignColumns: [t.id],
    name: 'internalization_parent_fk', // 约束名称
  }).onDelete('restrict'),
]))
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
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  ip: text('ip').notNull(),
  action: text('action').notNull(),

  method: methodEnum('method').notNull(),

  params: jsonb('params'),
  device: text('device').notNull(),
  os: text('os').notNull(),
  browser: text('browser').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const roleRelations = relations(role, ({ many }) => ({
  menus: many(roleMenu),
  users: many(userRole),
}))

export const roleMenuRelations = relations(roleMenu, ({ one }) => ({
  role: one(role, {
    fields: [roleMenu.roleId],
    references: [role.id],
  }),
  menu: one(menu, {
    fields: [roleMenu.menuId],
    references: [menu.id],
  }),
}))

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [userRole.roleId],
    references: [role.id],
  }),
}))

export const logsRelations = relations(logs, ({ one }) => ({
  user: one(user, {
    fields: [logs.userId],
    references: [user.id],
  }),
}))

// ==================== AiGate 业务表 ====================

/**
 * @description: 组织管理（四级：集团 → 分公司 → 部门 → 团队）
 */
export const orgLevelEnum = pgEnum('org_level', ['group', 'company', 'department', 'team'])

export const organization = pgTable('organization', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 组织名称 */
  name: text('name').notNull(),
  /** 父级组织 ID（树形结构） */
  parentId: text('parent_id'),
  /** 组织层级 */
  level: orgLevelEnum('level').default('company').notNull(),
  /** Token 配额上限 */
  tokenLimit: integer('token_limit').default(0).notNull(),
  /** Token 已用量 */
  tokenUsed: integer('token_used').default(0).notNull(),
  /** 配额重置日期 */
  resetDate: timestamp('reset_date'),
  /** 允许使用的模型列表 */
  allowedModels: jsonb('allowed_models').$type<string[]>().default([]),
  /** 每分钟请求限制 */
  rateLimits: integer('rate_limits').default(100),
  /** 是否启用 */
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('org_parent_idx').on(t.parentId),
  foreignKey({ columns: [t.parentId], foreignColumns: [t.id], name: 'org_parent_fk' }).onDelete('restrict'),
])
export const insertOrgSchema = createInsertSchema(organization).omit({ id: true, createdAt: true, updatedAt: true })
export const updateOrgSchema = createUpdateSchema(organization).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 渠道管理（上游 AI 供应商代理配置）
 */
export const channelStatusEnum = pgEnum('channel_status', ['enabled', 'disabled'])
export const channelHealthEnum = pgEnum('channel_health', ['healthy', 'degraded', 'down'])

export const channel = pgTable('channel', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 渠道名称，如 "Azure OpenAI 主力" */
  name: text('name').notNull(),
  /** 供应商名称 */
  vendor: text('vendor').notNull(),
  /** 供应商标签（用于展示） */
  vendorTag: text('vendor_tag').notNull(),
  /** API 端点 URL */
  endpoint: text('endpoint').notNull(),
  /** API 密钥（加密存储） */
  apiKey: text('api_key'),
  /** 支持的模型列表 */
  models: jsonb('models').$type<string[]>().default([]),
  /** 优先级（数字越小越优先） */
  priority: integer('priority').default(1).notNull(),
  /** 负载均衡权重 */
  weight: integer('weight').default(100).notNull(),
  /** 每秒查询限制 */
  qps: integer('qps').default(10).notNull(),
  /** 渠道状态 */
  status: channelStatusEnum('status').default('enabled').notNull(),
  /** 健康状态 */
  health: channelHealthEnum('health').default('healthy').notNull(),
  /** 限流 QPS */
  rateLimitQps: integer('rate_limit_qps').default(10),
  /** 限流 TPM（每分钟 Token 数） */
  rateLimitTpm: integer('rate_limit_tpm').default(50000),
  /** 限流 RPM（每分钟请求数） */
  rateLimitRpm: integer('rate_limit_rpm').default(1000),
  /** 限流策略：queue 排队 / reject 拒绝 / degrade 降级 */
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
  /** 密钥名称 */
  name: text('name').notNull(),
  /** 密钥值（唯一） */
  key: text('key').notNull().unique(),
  /** 所属用户 ID */
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  /** 所属组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 授权范围 */
  scopes: jsonb('scopes').$type<string[]>().default(['read', 'write']),
  /** 环境标识：PROD / DEV */
  env: text('env').default('PROD'),
  /** 过期时间 */
  expiresAt: timestamp('expires_at'),
  /** 最后使用时间 */
  lastUsed: timestamp('last_used'),
  /** 密钥状态 */
  status: apiKeyStatusEnum('status').default('active').notNull(),
  /** 累计调用次数 */
  calls: integer('calls').default(0),
  /** 累计费用（分） */
  cost: integer('cost').default(0),
  /** 每日调用上限 */
  dailyLimit: integer('daily_limit'),
  /** IP 白名单（CIDR 格式） */
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('api_key_user_idx').on(t.userId),
  index('api_key_org_idx').on(t.organizationId),
])
export const insertApiKeySchema = createInsertSchema(apiKey).omit({ id: true, createdAt: true, updatedAt: true })
export const updateApiKeySchema = createUpdateSchema(apiKey).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: AI 模型注册表
 */
export const aiModel = pgTable('ai_model', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 模型名称，如 GPT-4o */
  name: text('name').notNull(),
  /** 供应商：openai / anthropic / google / custom */
  provider: text('provider').notNull(),
  /** 模型类型：chat / completion / embedding / image */
  type: text('type').default('chat').notNull(),
  /** 上下文窗口大小（tokens） */
  contextWindow: integer('context_window').default(4096),
  /** 输入价格（每 1K tokens，分） */
  inputPrice: integer('input_price').default(0),
  /** 输出价格（每 1K tokens，分） */
  outputPrice: integer('output_price').default(0),
  /** 支持的特性列表 */
  features: jsonb('features').$type<string[]>().default([]),
  /** 模型状态：available / deprecated / maintenance */
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
  /** 工具名称 */
  name: text('name').notNull(),
  /** 工具描述 */
  description: text('description'),
  /** 工具类型：github / notion / database / api / custom */
  type: text('type').default('custom').notNull(),
  /** 所属组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 工具配置（JSON） */
  config: jsonb('config').default({}),
  /** 状态：active / inactive / error */
  status: text('status').default('active').notNull(),
  /** 健康状态：healthy / degraded / down */
  healthStatus: text('health_status').default('healthy'),
  /** 最后健康检查时间 */
  lastHealthCheck: timestamp('last_health_check'),
  /** 累计调用次数 */
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
  /** Agent 名称 */
  name: text('name').notNull(),
  /** Agent 描述 */
  description: text('description'),
  /** 所属组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 是否内置 Agent */
  builtin: boolean('builtin').default(false),
  /** 标签列表 */
  tags: jsonb('tags').$type<string[]>().default([]),
  /** 系统提示词 */
  systemPrompt: text('system_prompt'),
  /** 使用的模型 */
  model: text('model').default('gpt-4o'),
  /** 温度参数（0-100，实际值 / 100） */
  temperature: integer('temperature').default(30),
  /** 最大输出 Token 数 */
  maxTokens: integer('max_tokens').default(4096),
  /** 绑定的 MCP 工具 ID 列表 */
  tools: jsonb('tools').$type<string[]>().default([]),
  /** 绑定的知识库 ID 列表 */
  knowledgeBases: jsonb('knowledge_bases').$type<string[]>().default([]),
  /** 状态：active / inactive / archived */
  status: text('status').default('active').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('agent_org_idx').on(t.organizationId),
])
export const insertAgentSchema = createInsertSchema(agent).omit({ id: true, createdAt: true, updatedAt: true })
export const updateAgentSchema = createUpdateSchema(agent).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 知识库管理（RAG 文档向量化存储）
 */
export const knowledgeBase = pgTable('knowledge_base', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 知识库名称 */
  name: text('name').notNull(),
  /** 描述 */
  description: text('description'),
  /** 类型：document / database / api */
  type: text('type').default('document').notNull(),
  /** 所属组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 状态：indexing / ready / error */
  status: text('status').default('indexing').notNull(),
  /** 文档数量 */
  documentCount: integer('document_count').default(0),
  /** 存储大小（字节） */
  size: integer('size').default(0),
  /** 嵌入模型 */
  embeddingModel: text('embedding_model').default('text-embedding-3-large'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
}, t => [
  index('kb_org_idx').on(t.organizationId),
])
export const insertKbSchema = createInsertSchema(knowledgeBase).omit({ id: true, createdAt: true, updatedAt: true })
export const updateKbSchema = createUpdateSchema(knowledgeBase).omit({ id: true, createdAt: true, updatedAt: true })

/**
 * @description: 提示词库管理
 */
export const prompt = pgTable('prompt', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 提示词名称 */
  name: text('name').notNull(),
  /** 描述 */
  description: text('description'),
  /** 提示词内容 */
  content: text('content').notNull(),
  /** 分类：general / development / product / data */
  category: text('category').default('general').notNull(),
  /** 模板变量列表 */
  variables: jsonb('variables').$type<string[]>().default([]),
  /** 所属组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 使用次数 */
  usageCount: integer('usage_count').default(0),
  /** 创建者用户 ID */
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
 * @description: 系统告警
 */
export const alertTypeEnum = pgEnum('alert_type', ['quota_warning', 'key_expiring', 'error_spike', 'rate_limit', 'system'])
export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical'])

export const alert = pgTable('alert', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 告警类型 */
  type: alertTypeEnum('type').notNull(),
  /** 严重程度 */
  severity: alertSeverityEnum('severity').default('info').notNull(),
  /** 告警标题 */
  title: text('title').notNull(),
  /** 告警详情 */
  message: text('message').notNull(),
  /** 关联组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 关联用户 ID */
  userId: text('user_id').references(() => user.id),
  /** 关联资源 ID */
  resourceId: text('resource_id'),
  /** 是否已读 */
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/**
 * @description: API 调用日志（180 天留存）
 */
export const apiLog = pgTable('api_log', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 调用用户 ID */
  userId: text('user_id').references(() => user.id),
  /** 使用的密钥 ID */
  apiKeyId: text('api_key_id').references(() => apiKey.id),
  /** 所属组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 调用的模型名称 */
  model: text('model').notNull(),
  /** 模型供应商 */
  provider: text('provider'),
  /** 调用类型：chat / image / agent */
  type: text('type').default('chat'),
  /** 输入 Token 数 */
  inputTokens: integer('input_tokens').default(0),
  /** 输出 Token 数 */
  outputTokens: integer('output_tokens').default(0),
  /** 总 Token 数 */
  totalTokens: integer('total_tokens').default(0),
  /** 缓存命中的 Token 数 */
  cachedTokens: integer('cached_tokens').default(0),
  /** 本次调用费用（分） */
  cost: integer('cost').default(0),
  /** 响应延迟（毫秒） */
  latency: integer('latency').default(0),
  /** HTTP 状态码 */
  statusCode: integer('status_code').default(200),
  /** 调用状态：success / error / rate_limited */
  status: text('status').default('success').notNull(),
  /** 错误信息 */
  errorMessage: text('error_message'),
  /** 用户输入内容 */
  prompt: text('prompt'),
  /** 模型响应内容 */
  response: text('response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => [
  index('api_log_user_idx').on(t.userId),
  index('api_log_model_idx').on(t.model),
  index('api_log_created_idx').on(t.createdAt),
])
export const insertApiLogSchema = createInsertSchema(apiLog).omit({ id: true, createdAt: true })
export const updateApiLogSchema = createUpdateSchema(apiLog).omit({ id: true, createdAt: true })

/**
 * @description: 账单记录
 */
export const billingRecord = pgTable('billing_record', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  /** 组织 ID */
  organizationId: text('organization_id').references(() => organization.id),
  /** 账期，如 "2026-05" */
  period: text('period').notNull(),
  /** Token 用量 */
  tokenUsage: integer('token_usage').default(0),
  /** 费用（分） */
  cost: integer('cost').default(0),
  /** 状态：pending / paid / overdue */
  status: text('status').default('pending').notNull(),
  /** 到期日 */
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
export const insertBillingSchema = createInsertSchema(billingRecord).omit({ id: true, createdAt: true })
export const updateBillingSchema = createUpdateSchema(billingRecord).omit({ id: true, createdAt: true })