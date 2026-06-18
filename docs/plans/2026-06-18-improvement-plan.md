# AiGate 改进计划

> 日期：2026-06-18
> 来源：全量代码审查 + 架构分析，问题分为 P0（阻断生产）/ P1（高可靠性风险）/ P2（中等质量问题）/ P3（技术债清理）四个优先级。
> 执行原则：每个 Issue 独立 PR，改完即补测试，不跨 Issue 捆绑。

---

## P0 阻断级（上线前必修）

### P0-1 账单成本永远为零

**问题**：`server/api/gateway/[...path].ts` 的 `persistGatewaySuccessLog` 函数中 `const cost = 0` 硬编码。`ai_model` 表已有 `inputPrice`/`outputPrice` 字段（每千 token 单价），但从未参与任何计算。`api_log.cost`、`billing_record.cost` 全部写 0，导致账单、配额成本分析、仪表盘费用图全部失真。

**方案**：

1. 在写日志前查询该 `model` 对应的 `ai_model` 记录取出 `inputPrice`/`outputPrice`。
2. `cost = (inputTokens * inputPrice + outputTokens * outputPrice) / 1000`，保留 8 位小数，单位元。
3. `consumeQuota` 同步传入真实 cost，`organization.tokenUsed` 继续记 token 数，新增 `organization.costUsed` 字段记累计成本（需新 migration）。
4. 补单元测试：mock 模型价格 → 断言写入 cost 正确。

**验收**：发起一次真实调用，`api_log.cost` > 0 且与上游账单同量级误差 < 5%。

---

### P0-2 上游渠道 API Key 明文存储

**问题**：`channel_credential.apiKey` 在 PostgreSQL 中明文存储。数据库被拖库时，所有接入的上游 AI 服务（OpenAI、Anthropic 等）Key 全部泄露，导致直接经济损失。

**方案**：

1. 引入 `node:crypto` AES-256-GCM 对称加密，密钥来自新增 env `CREDENTIAL_ENCRYPTION_KEY`（32 字节随机 hex）。
2. 新增 `server/utils/credential-crypto.ts`：`encrypt(plaintext): string`（`iv:tag:ciphertext` Base64 格式）和 `decrypt(ciphertext): string`。
3. 写入凭证时加密，读取凭证用于代理时解密（仅在内存中短暂存在明文）。
4. 新增一次性迁移脚本 `scripts/migrate-encrypt-credentials.mjs`：读取所有 `channel_credential`，加密后回写（需在生产维护窗口执行）。
5. 补单元测试：encrypt → decrypt 往返正确；空值/边界值处理。

**验收**：数据库中 `apiKey` 字段均为加密格式，网关代理仍能正常调通上游。

---

### P0-3 中文 Token 估算严重偏低

**问题**：网关在无法解析上游 `usage` 字段时回退到 `字符数 / 4` 估算。该公式适用于英文（平均 4 字符/token），但中文一个汉字约等于 1-2 token，中文文本会被低估 4-8 倍，导致配额消耗严重不准确。

**方案**：

1. 在 `gateway-usage.ts` 中把 `estimateTokensFromText` 改为检测字符串的 Unicode 范围：
   - 中文字符（U+4E00–U+9FFF 等）：每字符计 1.5 token
   - ASCII 字母/数字：每 4 字符计 1 token
   - 混合文本：按比例加权
2. 在 `api_log` 的 `tokensEstimated = true` 时，日志 UI 展示「估算」角标，不以估算值参与精确账单。
3. 补单元测试：纯中文、纯英文、中英混合三个场景断言估算误差 < 30%。

**验收**：发送「你好世界」（4字）估算值 ≥ 4 token（不是 1）。

---

### P0-4 IP 白名单可被 x-forwarded-for 伪造

**问题**：`server/utils/gateway.ts` 的 IP 白名单逻辑从请求头提取客户端 IP，但没有限制"只信任来自已知反向代理的 `x-forwarded-for`"。攻击者直接向 Node 进程发请求时，可以在请求头中写入 `x-forwarded-for: 127.0.0.1` 绕过白名单。

**方案**：

1. 新增 env `TRUSTED_PROXY_CIDRS`（逗号分隔，如 `10.0.0.0/8,172.16.0.0/12`，默认空）。
2. 只有当直连 IP（socket remoteAddress）在 `TRUSTED_PROXY_CIDRS` 范围内时，才信任 `x-forwarded-for` 最左值；否则直接用 socket IP。
3. 在 `nuxt.config.ts` 中通过 `nitro.trustProxy` 配置或在中间件层统一处理。
4. 补测试：mock 请求头伪造场景，断言白名单未被绕过。

**验收**：不通过代理直连时，伪造 `x-forwarded-for` 不能绕过白名单。

---

## P1 高可靠性风险

### P1-1 进程内状态不支持多实例部署

**问题**：三处进程内状态在多实例/集群部署时行为异常：

- `credentialCursor: Map<string, number>` — 凭证轮询游标内存独立，多实例间不共享，导致某实例独占某凭证
- `rateLimiter`（推测内存实现）— 速率限制形同虚设
- `server/utils/tenant.ts` 60 秒内存缓存 — 修改租户状态后不同实例看到不同数据

**方案**：

1. 引入 Redis（或使用已有 PostgreSQL 模拟）作为共享状态存储，项目中添加 `ioredis` 可选依赖，通过 `REDIS_URL` env 控制启用。
2. `credentialCursor` 改为 Redis `INCR/EXPIRE` 原子操作实现分布式轮询，若无 Redis 降级为本地 Map（单实例可用）。
3. 速率限制改为 Redis Sliding Window（`rate-limiter-flexible` 库，支持 Redis/内存双模式）。
4. 租户缓存改为 Redis `setex`，缓存键 `tenant:{orgId}`，失效时间 60s；修改租户时 `del` 对应键。
5. 所有改动均在无 Redis 时自动降级，不破坏单实例部署。

**验收**：两个进程同时跑网关代理，凭证轮询均匀分布；租户停用后两个进程均在 60s 内生效。

---

### P1-2 文档处理管线无持久化队列，进程重启丢工作

**问题**：知识库文档上传后，Embedding 处理以 fire-and-forget 方式在请求处理链中启动。进程重启时处理中的文档状态永远停在 `parsing`/`chunking`/`embedding`。虽有启动插件将非终态文档置 `failed`，但实际工作已丢失，用户必须手动重试。

**方案**：

1. 引入 `pg-boss`（基于 PostgreSQL 的持久化任务队列，无额外依赖）。
2. 创建 `knowledge_job` 队列，任务包含 `{ documentId, knowledgeBaseId }`，最大重试 3 次，退避 30s。
3. 上传接口只插入队列并立即返回 `202 Accepted`，状态由轮询获取（现有机制已支持）。
4. Nitro 启动时开启一个 `pg-boss` worker 消费队列，最大并发 2（防止 embedding 调用打爆上游）。
5. 任务失败时更新 `document.status = 'failed'`，记录 `errorMsg`；成功时置 `ready`。
6. 启动插件改为：只重新入队 `queued` 状态文档，`pg-boss` 保证 at-least-once 执行。

**验收**：上传大文档后立即重启进程，文档在重启后自动继续处理直到 `ready`。

---

### P1-3 删除组织时配额不释放（配额慢漏洞）

**问题**：`quota.ts` 验证子级之和不超父级，但删除子组织时没有将其 `tokenLimit` 归还给父级。随着组织频繁创建删除，父级的"可分配配额"越来越少，最终即使子级总用量为零也无法再分配。

**方案**：

1. 在 `server/api/aigate/organization/[id].delete.ts` 中，删除前查出该组织的 `tokenLimit`，在同一个 DB 事务内：
   - 将子组织的 `tokenLimit` 归还到父级（`parentId.tokenLimit += org.tokenLimit`）
   - 递归处理子树（先删子节点，逐层归还）
   - 最后删除目标节点
2. 同理，组织从一个父节点迁移到另一个时（编辑 `parentId`），事务内先从旧父扣除，再给新父返还。
3. 补单元测试：删除带配额的子组织 → 父级可分配额恢复。

**验收**：创建子组织（分配 1000 token）→ 删除该子组织 → 父级可用配额恢复 1000。

---

### P1-4 MCP stdio 工具命令注入风险

**问题**：`mcp_tool.command` 和 `args` 字段存储用户输入的 shell 命令，Nitro 在执行 stdio 类型 MCP 工具时直接传入 `child_process`。如果存储层被注入或管理员误操作，可在服务器上执行任意命令。

**方案**：

1. 创建命令白名单 `ALLOWED_MCP_COMMANDS`（env 配置，如 `uvx,npx,node,python,python3`），保存/执行时校验 `command` 在白名单内。
2. `args` 数组中每个元素限制不含 shell 特殊字符（`;|&$<>`），通过 zod schema 校验。
3. 不使用 shell: true 选项，始终以数组形式调用 `execFile`（非 `exec`），阻止 shell 注入。
4. 在管理界面的命令输入框添加格式说明和后端错误提示。

**验收**：尝试保存含 `; rm -rf /` 的 args → 后端返回 400；白名单外命令 → 保存失败。

---

## P2 中等质量问题

### P2-1 pgvector 大规模检索精度下降

**问题**：当前 HNSW 索引是全局的（所有知识库共享），检索时通过 `WHERE knowledge_base_id = ?` 过滤。pgvector 的 HNSW 是先做近似近邻搜索、后过滤，而不是在特定分区内搜索，当某知识库数据量占比小时，ANN 候选集中命中该 KB 的概率低，召回率下降。

**方案**：

1. 短期：将 `top_k` 候选数临时扩大 3-5 倍（如配置 topK=5 则先取 25），过滤后再取前 topK，牺牲一点性能换召回率。
2. 中期：升级到 pgvector 0.7+，利用 `hnsw (embedding vector_cosine_ops)` + `WHERE` 的 partition pruning 能力；或按 KB ID 做分区表，每个 KB 独立索引。
3. 在 KB 详情页的"搜索测试" Tab 显示召回的相似度分值，便于用户发现精度问题。

**验收**：10 个 KB 各 100 文档，跨 KB 精确查询，召回命中率 > 90%（top-5 内）。

---

### P2-2 大表缺游标分页，OFFSET 性能退化

**问题**：`api_log`、`logs`（操作日志）等预计百万行级的表，列表 API 使用 `OFFSET N LIMIT M` 分页。`OFFSET 90000` 需扫描 90000 行才能跳过，在大数据量下响应时间线性退化，且在数据插入后 OFFSET 结果不稳定（"幽灵翻页"）。

**方案**：

1. 在 `server/utils/pagination.ts` 中新增游标分页辅助函数：基于 `createdAt + id` 的组合游标（`createdAt DESC, id DESC`），通过 `WHERE (createdAt, id) < (cursorTime, cursorId)` 跳转。
2. 优先改造 `api_log` 和操作日志 API，因为这两个表增长最快。
3. 前端分页组件改为"加载更多"或无限滚动，废弃页码跳转（大 OFFSET 无意义）。
4. 保留 OFFSET 分页给小表（< 10 万行）使用。

**验收**：api_log 100 万行时，翻到最后一页响应时间 < 200ms（vs OFFSET 方案可能 > 5s）。

---

### P2-3 无 API 版本控制

**问题**：所有 API 路径为 `/api/aigate/...`，无版本前缀。未来破坏性变更（字段重命名、接口合并）无法平滑升级，外部接入方会被直接影响。

**方案**：

1. 在 `nuxt.config.ts` 的 `nitro.routeRules` 中为现有路径添加别名 `/api/v1/...`，对应 `/api/aigate/...`，实现兼容。
2. 网关代理路径 `/api/gateway/...` 保持不变（这是 OpenAI 兼容接口，不能随便变动）。
3. 新的破坏性变更在 `/api/v2/...` 下实现，并在 `/api/v1/...` 保留旧行为至少 3 个月（设置 `Deprecation` 响应头提示）。
4. OpenAPI 文档分组按版本展示。

**验收**：`/api/v1/aigate/channel` 和 `/api/aigate/channel` 返回相同结果。

---

### P2-4 忘记密码无自助通道，管理员负担重

**问题**：D5 决策删除了 magic link 和忘记密码链路，用户忘记密码只能找管理员重置。在没有 SSO 的前提下，这会给管理员带来持续的工单负担，也影响用户体验。

**方案**：

1. 在 better-auth 的 admin 插件基础上，在"用户管理"页面为每个用户添加「重置密码」操作：管理员设置临时密码，勾选「强制下次登录修改密码」。
2. 新增 `user.mustChangePassword: boolean` 字段（migration），登录成功后检测该字段，跳转密码修改页后才放行。
3. 密码修改页不需要旧密码（已知是强制修改场景），只需输入两次新密码。
4. 可选：向用户注册邮箱发送临时密码通知邮件（通过 Resend）。

**验收**：管理员重置密码 → 用户登录被重定向到修改密码页 → 修改后正常进入系统。

---

### P2-5 缺少健康检查端点

**问题**：没有 `/health` 或 `/ready` 端点。Docker/K8s liveness/readiness probe 无法配置，负载均衡器无法自动剔除不健康节点，排障时无法快速确认服务状态。

**方案**：

1. 新增 `server/api/health.get.ts`：
   - `liveness`：始终返回 `{ status: 'ok', timestamp }` + HTTP 200，只要进程还活着就成功。
   - `readiness`（`?mode=ready`）：额外验证 DB 连接（`SELECT 1`）和 pgvector 扩展可用，任一失败返回 503。
2. 在 `docs/deploy/k8s/deployment.yaml` 中配置 `livenessProbe` 和 `readinessProbe`。
3. 在 `docs/MONITORING.md` 补充健康检查说明。

**验收**：`GET /api/health` 返回 200 `{ status: 'ok' }`；DB 不可用时 `?mode=ready` 返回 503。

---

### P2-6 管理员角色依赖 env 变量 ID 列表，脆弱

**问题**：`BETTER_AUTH_ADMIN_USER_IDS` 是硬编码的 UUID 列表。重置数据库后 ID 变了、env 漏配，系统就没有管理员。多环境部署时极容易出现配置漂移。

**方案**：

1. 在 `role` 表中保留超管角色（code = `super_admin`），`user_role` 关联表已存在，改为以 DB 角色为主要判断源。
2. `server/utils/context.ts` 的 `isAdmin` 判定优先检查 `user_role` 中是否有 `super_admin` 角色，兼容 `BETTER_AUTH_ADMIN_USER_IDS` 作为启动时 bootstrap 机制（首次启动时自动给列表中的用户分配 super_admin 角色）。
3. 提供 `scripts/promote-admin.mjs --username xxx` 脚本（已存在，确认功能正确）来添加超管，而不是改 env。

**验收**：清空 `BETTER_AUTH_ADMIN_USER_IDS` env 后，已在 `user_role` 表中有 super_admin 的用户仍有管理权限。

---

## P3 技术债清理

### P3-1 删除废弃的 deterministicEmbedding 函数

**问题**：`server/utils/knowledge-rag.ts` 中的 `deterministicEmbedding` 函数标记为 `@deprecated`，是 WP2 之前的伪向量占位实现，现在已无任何代码路径引用，但还留在文件里造成混淆风险。

**方案**：确认无引用后直接删除该函数及其测试 case（如有）。单次 PR，改动极小。

---

### P3-2 拆分 schema.ts（1219 行单文件）

**问题**：所有业务表定义在一个 1219 行的文件中，TypeScript 编译慢，协作时 merge conflict 频繁，认知负担重。

**方案**：
按领域拆分为：

- `app/db/schemas/system.ts`（menu、role、user_role、internalization、logs）
- `app/db/schemas/tenant.ts`（organization、member、tenant*package、quota*\*）
- `app/db/schemas/gateway.ts`（channel、channel_credential、api_key、ai_model、model_combo\*、api_log、billing_record）
- `app/db/schemas/knowledge.ts`（storage_instance、knowledge_base、document、document_chunk、skill、skill_file）
- `app/db/schemas/agent.ts`（agent、agent\_\*、conversation、conversation_message、prompt、prompt_version）
- `app/db/schemas/mcp.ts`（mcp_tool、mcp_tool_version）
- `app/db/schemas/alert.ts`（alert、alert_rule、user_notification_pref）
- `app/db/schema.ts`：改为 re-export 所有 schema（保持现有 import 路径兼容）

拆分时不修改表结构，纯文件组织重构，不需要新 migration。

---

### P3-3 拆分 agent-chat.ts（785 行超大文件）

**问题**：`server/utils/agent-chat.ts` 单文件负责对话历史管理、RAG 召回、MCP 工具绑定、Skill 加载、流式响应、消息保存、引用溯源，职责过多。

**方案**：
拆分为：

- `agent-runtime.ts`：构建 Agent 运行时（系统提示 + RAG + MCP + Skill 绑定）
- `agent-stream.ts`：处理流式/非流式响应、工具调用执行
- `agent-history.ts`：对话历史管理（获取、保存、窗口截断）
- `agent-chat.ts`：保留为入口文件，组合调用上述模块

---

### P3-4 补充 Migration Rollback 脚本

**问题**：28 个 migration 全是 forward-only。生产环境如果 migration 出问题，rollback 需要手写逆向 SQL，时间压力下容易出错。

**方案**：

1. 在 `app/db/migrations/` 旁边建立 `app/db/rollbacks/` 目录，为每个 migration 提供对应的回滚 SQL。
2. 新增 `scripts/rollback-migration.mjs <version>` 脚本，读取回滚 SQL 执行。
3. 至少补齐最近 5 个 migration 的回滚脚本（0023-0027）。

---

### P3-5 Sentry 配置收敛

**问题**：`@sentry/node` 和 `@sentry/vue` 已引入，但没有看到采样率、性能追踪、issue 分组规则等配置。默认配置下 Sentry 可能产生大量噪音或高额账单。

**方案**：

1. 在 `server/plugins/sentry.ts` 中配置：
   - `tracesSampleRate: 0.1`（10% 性能追踪采样）
   - `ignoreErrors`：过滤 4xx 用户错误，只上报 5xx
   - `beforeSend`：过滤重复的认证失败
2. 在 `nuxt.config.ts` 的 Sentry Vue 插件配置相同采样率。
3. 建立 Sentry 告警规则：5xx 错误 > 10/分钟时触发 PagerDuty/邮件。

---

## 实施路线图

```
周 1（紧急修复）
  ├── P0-1 成本计算
  ├── P0-2 凭证加密（前置：设计加密方案 + 迁移脚本）
  └── P0-3 中文 Token 估算修正

周 2（安全加固）
  ├── P0-4 IP 白名单代理信任链
  ├── P1-4 MCP 命令注入防护
  └── P2-5 健康检查端点

周 3-4（可靠性）
  ├── P1-1 多实例共享状态（Redis 或 PG 降级方案）
  ├── P1-2 文档处理持久化队列（pg-boss）
  └── P1-3 组织删除配额释放

周 5-6（体验与质量）
  ├── P2-1 pgvector 召回精度（超采 + 分数展示）
  ├── P2-2 游标分页（api_log 优先）
  ├── P2-4 管理员密码重置功能
  └── P2-6 管理员角色 DB 驱动

周 7+（技术债）
  ├── P2-3 API 版本控制
  ├── P3-1 删除废弃函数
  ├── P3-2 schema.ts 拆分
  ├── P3-3 agent-chat.ts 拆分
  ├── P3-4 Migration rollback 脚本
  └── P3-5 Sentry 配置收敛
```

---

## 挂起项（明确不在本计划内）

| 项                              | 挂起原因                         |
| ------------------------------- | -------------------------------- |
| SSO（LDAP/OIDC/企微/钉钉）      | 需求验证中，待企业客户确认后立项 |
| 付费套餐 / 订阅 / 支付流        | 商业化阶段再议                   |
| Onboarding 首次入驻向导         | 待底座稳定后再做                 |
| Webhook / Hooks 配置中心        | 依赖资产市场模式验证             |
| Milvus / Elasticsearch 向量存储 | pgvector 先跑通，再扩展          |
| 白标定制 / 开放 API             | 旗舰版商业化需求，未排期         |
| Prompt 公共市场                 | 依赖资产市场统一模式             |
| 系统状态页 / 开发者中心         | P2 级，随主线顺带                |
