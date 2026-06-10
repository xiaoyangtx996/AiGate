# AiGate 系统问题审计与优化计划 Spec

版本：v1.0
日期：2026-06-09
范围：`AiGate-app` 当前工作树、`docs/v2.0` 产品与 UI 规范、现有测试与审计结果。

## 1. 审计结论

AiGate 当前已经从早期原型推进到可运行的 Nuxt 4 全栈应用：具备 Better Auth、PostgreSQL + Drizzle、系统设置、组织/渠道/API Key/Agent/知识库/MCP/Prompt/告警/计费等核心模块，并有较多 Vitest 与 Playwright 测试文件。

但系统距离 PRD v2.0 所描述的“企业级 AI 全栈管控平台”仍有明显差距，主要集中在 6 类问题：

1. 质量门禁已恢复为可用基线：全量 Vitest、`pnpm lint`、生产 server typecheck、server test typecheck、OpenAPI 覆盖检查与 `nuxt typecheck` 均已通过；剩余问题是耗时仍偏高且需固化到 CI。
2. API 契约路径覆盖与成功响应 schema 已补齐：`docs/openapi.json` 当前覆盖 64 条路径、95 个 operation，95 个 operation 均已有具名成功响应 schema，剩余工作是继续补充认证说明、示例与更精确的字段约束。
3. 错误语义核心收口已完成：后端错误状态、OpenAPI 错误模型和前端 `$request` 错误判定已补齐；剩余风险在逐页面错误态、权限态和重试入口未系统验证。
4. 产品功能仍未完全闭环：配额审批与员工门户 MVP 已形成，但月报、RAG 向量化、Agent 引用溯源、AiGate Bot、SSO、操作审计不可篡改等仍缺失或仅有弱实现。
5. UI 规范仍需逐页落地：Vue 侧已建立 `useUiAuthorization` + `v-permission` 等价机制；错误状态、危险操作确认词、图表说明、URL 筛选同步、数据时效、响应式与可访问性需要逐页补齐。
6. 文档与实现不一致：旧优化计划存在乱码且基于过期规模；当前已确认 `.github/workflows` 存在并补齐 CI 门禁，本地 Windows `pnpm build` 已通过 Nitro 配置收口恢复；迁移 journal 未登记部分迁移文件，已通过补充脚本纳入校验路径。

## 2. 证据摘要

### 2.1 仓库与规模

- 技术栈：Nuxt 4、Vue 3、TypeScript、Nuxt UI、PostgreSQL、Drizzle ORM、Better Auth、Vitest、Playwright。
- 业务/系统页面：约 47 个，位于 `app/pages/aigate`、`app/pages/system-settings`、`app/pages/docs`。
- 非测试 API 文件：约 87 个，位于 `server/api/aigate`、`server/api/system-settings`、`server/api/gateway`。
- 测试相关文件：约 69 个，覆盖 `server/utils`、`server/api/aigate`、`test`、`e2e`。

### 2.2 本次执行结果

- 通过：`pnpm exec vitest run --reporter=dot`
  - 2026-06-09 续跑 70 个测试文件通过，593 个测试通过，耗时约 39.66 秒。
- 通过：`node scripts/verify-migration-consistency.mjs`
  - 迁移一致性检查通过；9 个 journaled migrations、11 个 SQL 文件，`0007` 与 `0010` 明确为 supplemental unjournaled SQL。
- 通过：`node scripts/apply-all-migrations.mjs --dry-run`
  - 56 条补充 SQL dry-run 成功，核心表与索引校验项列出完整。
- 通过：OpenAPI JSON 解析与覆盖检查
  - `docs/openapi.json` 当前 paths=64，operations=95，missing=0。
- 通过：`pnpm lint`
  - 2026-06-09 续跑全量 ESLint 通过，范围为 `app server shared test e2e`，耗时约 78 秒。
- 通过：`pnpm typecheck:server`
  - 新增显式 `typescript` devDependency、`tsconfig.server.prod.json` 与生产 server/shared 类型门禁；2026-06-09 续跑通过，约 30 秒。
- 通过：`pnpm test:openapi`
  - OpenAPI coverage OK；expected operations=95、spec paths=64、spec operations=95、detailed success schemas=95。
- 通过：`pnpm exec nuxt typecheck`
  - 2026-06-09 续跑通过，耗时约 140.5 秒；已将根 `tsconfig.json` 的 Nuxt typecheck 边界聚焦到 app/shared/node，server 生产类型继续由 `pnpm typecheck:server` 覆盖，server 测试类型由 `pnpm typecheck:server:test` 独立覆盖。
- 通过：`pnpm typecheck:server:test`
  - 2026-06-09 续跑通过；已修复 server 测试 mock event、流式/JSON 响应联合类型、测试响应 data 收窄、Zod v4 `z.record` 签名和严格空值索引等测试类型债。
- 通过：`.github/workflows/ci.yml` 格式与迁移 dry-run 校验
  - 已将 CI 拆分为 `lint`、`typecheck-app`、`typecheck-server`、`typecheck-server-test`、`openapi`、`unit`、`migrations`、`build`、`e2e` 多 job；`prettier --check`、`verify-migration-consistency`、`apply-all-migrations --dry-run` 通过。
- 通过：`pnpm build`
  - 2026-06-10 Windows 本地验证通过，耗时约 12 分 47 秒；关键日志为 Client built 237.2 秒、Server built 148.3 秒、`Nuxt Nitro server built`、总大小 9.32 MB。
  - 处理方式：移除 Nitro 中手动注入的 `@vitejs/plugin-vue`，保留 `nitro.experimental.bundleRuntimeDependencies = false`，并在 Windows 下设置 `nitro.externals.trace = false`，避免 Nitro/NFT 外部依赖追踪在本地文件系统上长期卡住。
  - 剩余风险：Windows 构建输出依赖项目根 `node_modules` 解析，不应作为独立部署产物；CI/部署侧仍需在 Ubuntu + Node 20 环境验证 trace 开启时的构建结果。
- 续跑进展：已补充 `useRequest` / `useAigateApi` 基础泛型、修正 `app.vue` locale 合并类型与 Nuxt 配置类型，并修复 `DashboardCharts`、`Particles`、`UserMenu`、i18n、MCP、Prompt、Channel、Gateway、Knowledge Base、Members 等前端类型断点。
  - 局部验证通过：`pnpm exec vitest run server/utils/__tests__/index-utils.test.ts server/api/aigate/__tests__/agent-chat-handler.test.ts server/api/aigate/__tests__/channel-handlers.test.ts --reporter=dot`，3 个文件、45 个测试通过。
  - 当前环境下 `pnpm exec nuxt typecheck` 已从“无完整输出”推进到“通过”；全量 Vitest 与 `typecheck:server:test` 已恢复通过，但仍建议拆分为更稳定的 CI job。

### 2.3 历史页面审计结果

- `scripts/page-smoke-test-result-latest.txt`：
  - 32 个页面全部 200，但 `/docs/api` 为 WARN。
- `scripts/browser-audit-result.txt`：
  - 28 个页面中 4 个失败：`/docs/api`、`/aigate/mcp-tools/marketplace`、`/aigate/prompts`、`/aigate/organizations`。
  - 该结果时间为 2026-06-05，可能已有部分修复，但仍说明需要把页面审计纳入稳定门禁。
- `scripts/page-smoke-test-result.txt`：
  - 用户初始化出现 `Missing or null Origin`。
  - 登录按钮定位严格模式冲突，说明 E2E 选择器需要更稳定的测试标识。

## 3. 现存问题清单

### P0：必须优先解决

#### P0-1. 全量质量门禁已恢复，CI 已补齐一版，build 阶段已恢复本地基线

问题：
全量 Vitest、lint、OpenAPI 覆盖检查、生产 server/shared 类型检查、server 测试类型检查、Nuxt/Vue typecheck 与本地 Windows `pnpm build` 已恢复可用，`.github/workflows/ci.yml` 已拆分为多 job 覆盖这些门禁与迁移校验。当前主要风险已从“命令不可用/CI 缺失”转移为“构建耗时偏高与 CI 环境差异”：CI build job 仍需在 Ubuntu + Node 20 上确认。

影响：
团队无法稳定判断一次改动是否安全，后续功能补齐会增加回归风险。

验收：

- `pnpm lint` 输出确定结果并通过，后续继续优化到 60 秒内完成。
- `pnpm typecheck:server` 在 90 秒内完成并通过。
- `pnpm exec nuxt typecheck` 或等价前端 Vue typecheck 输出确定结果并通过，后续优化到 90 秒内完成。
- `pnpm exec vitest run` 在 120 秒内完成，或拆分为可并行 workflow 且每个 job 有确定上限。
- `pnpm build` 在 Windows 本地与 Node 20 + CI 等价环境中稳定完成；Windows 本地已通过，CI 等价环境待验证。

当前进展：

- 已确认 `pnpm exec vue-tsc --noEmit` 在当前依赖中不可用，类型门禁应继续以 `pnpm exec nuxt typecheck` 为准。
- 已清理 `app/app.vue` 与 `app/components` 目录的 lint 错误/警告；`pnpm exec eslint app/components --format stylish` 当前通过。
- 已清理 `app/utils`、`app/plugins`、`app/composables` 目录的 lint 错误；相关目录 ESLint 通过，`export-utils`、`ui-authorization`、`request-error` 单测 19 个通过。
- 已清理 `app/stores`、`app/middleware`、`app/layouts`、`app/pages/auth` 的 lint 错误；合并基础前端目录 ESLint 通过。
- 已清理 `app/pages/aigate` 页面目录 lint 错误/警告；补齐 `scripts/page-smoke-test.mjs` 中员工门户与配额审批新增页面路由，`test/smoke-routes.test.ts` 2 个测试通过。
- 已清理 `shared/i18n/default-messages.ts` 与 `server/utils/default-menus.ts` 大文件格式 lint；`server/utils/__tests__/default-menus.test.ts` 6 个测试通过。
- 已清理 `server/api/aigate`、`server/utils/gateway.ts`、`server/utils/agent-chat.ts` lint；相关 API/gateway 测试 32 个通过。
- 已清理 `server/utils/__tests__`、`server/api/gateway`、`server/api/system-settings`、`server/middleware/__tests__`、`server/utils/validation.ts`、`server/utils/quota.ts`、`server/plugins/seed-menus.ts` lint；相关测试 40 个通过。
- 2026-06-09 续跑 `pnpm lint` 全量通过。
- 已修复 API Key 生成逻辑，改用 `randomBytes(16).toString('hex')`，并修正唯一性测试，避免 lint 自动建议把随机生成退化为单字符重复填充。
- 已完成最后一批 lint 收口：E2E 登录按钮正则、`innerText`、API Key 正则、Magic Link 未用参数、MCP health 斜杠正则等均已清理；相关 scoped ESLint 通过。
- 已拆分 server 类型门禁：`.nuxt/tsconfig.server.json` 会包含 `server/**/__tests__` 并产生大量 H3Event mock 类型噪音；新增 `tsconfig.server.prod.json` 只检查生产 server/shared 代码，新增 `tsconfig.server.test.json` 保留测试类型债显式暴露。
- 已修复 production server 类型错误：SSE 流式响应改为 `ReadableStream`，移除 channel 不存在的 `organizationId` 过滤/写入，修正 gateway 不存在的 `rateLimitPerMin` 字段，补齐 insert returning 空值检查、枚举 query 收窄、账期解析校验、日志 schema 写入不一致等。
- 2026-06-09 续跑 `pnpm typecheck:server` 通过；相关 server/API/gateway/alert/logs 测试 112 个通过。
- 2026-06-09 续跑 `pnpm exec nuxt typecheck` 通过，耗时约 140.5 秒；已清理 `DashboardCharts`、`Particles`、`UserMenu`、`useRequest`、页面 DTO、i18n 类型、`reka-ui` 类型导入和 server test mock 污染根 typecheck 的问题。
- 2026-06-09 续跑 `pnpm typecheck:server:test` 通过；已通过测试 helper 返回 `H3Event`、`asResponse<T>` 测试收窄、`responseSuccess<T>` 成功响应泛型和严格空值修正收口 server 测试类型债。
- 2026-06-09 已重写 `.github/workflows/ci.yml` 为并行多 job：`lint`、`typecheck-app`、`typecheck-server`、`typecheck-server-test`、`openapi`、`unit`、`migrations`、`build`、`e2e`；迁移 job 覆盖 journal 一致性、补充 SQL dry-run、Drizzle migrate 与补充迁移执行。
- 2026-06-09 已修复两个构建生命周期隐患：移除 `nuxt.config.ts` 中不必要的 Nitro `@vitejs/plugin-vue` Rollup 插件注入；为限流清理定时器增加 `unref()`，为 PostgreSQL pool 增加 `allowExitOnIdle`。
- 2026-06-10 已恢复 Windows 本地 `pnpm build`：通过 `nitro.experimental.bundleRuntimeDependencies = false` 避免内联大量 Nitro runtime dependencies，并设置 `nitro.externals.trace = process.platform !== 'win32'`，在 Windows 本地跳过 Nitro/NFT 外部依赖追踪；最终 `pnpm build` 通过，耗时约 12 分 47 秒。
- 仍需完成：在 CI Ubuntu + Node 20 环境验证 trace 开启时的实际 build 结果；继续优化前端与 SSR 构建耗时，当前本地 build 仍超过 10 分钟。

#### P0-2. 错误响应与 HTTP 状态不一致

问题：
大量 API 使用 `catch (err) { return responseError(err) }`，`responseError` 固定返回业务 `code=500`，但通常不会设置 HTTP status。前端可能拿到 HTTP 200 + 业务失败，难以统一错误态、重试、监控与 OpenAPI 契约。

影响：
错误监控、客户端错误处理、E2E 断言和外部 API 调用都会变得不可靠。

验收：

- 统一错误结构：`{ code, msg, data, timestamp, traceId? }` 或明确替代格式。
- 4xx/5xx 场景设置真实 HTTP status。
- `createError`、Zod 校验、数据库异常、权限异常都有明确映射。
- 前端 `$request` 能统一弹出错误、保留页面错误态，并支持重试。

当前进展：

- 已在 `server/utils/index.ts` 中增强 `responseError`：支持从 `statusCode/status/code`、Zod issues、PostgreSQL unique violation 推导业务 `code`，并可通过 `setResponseStatus` 设置真实 HTTP status。
- 已新增 `server/middleware/error-handler.ts` 响应中间件：对返回体中 `code` 为 4xx/5xx 的统一响应补设真实 HTTP status，兼容旧 handler 中 `responseSuccess(..., 404/403)` 的历史写法。
- 已在 `server/utils/__tests__/index-utils.test.ts` 和 `server/middleware/__tests__/error-handler.test.ts` 覆盖 401、400 validation、409 unique violation、生产环境 500 信息隐藏，以及 response body code 到 HTTP status 的映射。
- 已清理 Channel 模块旧错误响应语义：`channel/[id].get|put|delete`、`channel/[id]/stats.get`、`channel/health-check.post` 的 404 场景改为 `responseError(..., { statusCode: 404 })`；局部验证 `channel-handlers.test.ts` 19 个测试通过，相关 handler 与测试 ESLint 通过。
- 已清理 API Key 模块旧错误响应语义：`api-key/index.post` 的 401/400 与 `api-key/[id].put|delete` 的 404 场景改为 `responseError(..., { statusCode })`；局部验证 API Key handler 测试 10 个通过，相关 handler 与测试 ESLint 通过。
- 已清理 Alert 模块旧错误响应语义：`alert/[id].put|delete`、`alert/check.post`、`alert/rule/[id].put|delete` 的 403/404 场景改为 `responseError(..., { statusCode })`；局部验证 Alert/Admin/Delete handler 测试 26 个通过，相关 handler 与测试 ESLint 通过。
- 已清理 Agent 模块旧错误响应语义：`agent/[id].get|put|delete` 的 404 场景改为 `responseError(..., { statusCode: 404 })`；局部验证 Agent handler 测试 18 个通过，相关 handler 与测试 ESLint 通过。
- 已清理 Prompt 模块旧错误响应语义：`prompt/[id].put|delete`、`prompt/import.post`、`prompt/[id]/versions/index.get`、`prompt/[id]/versions/[versionId]/restore.post` 的 400/404 场景改为 `responseError(..., { statusCode })`；局部验证 Prompt/Delete handler 测试 23 个通过，相关 handler 与测试 ESLint 通过。
- 已清理 MCP Tool 与 Knowledge Base 模块旧错误响应语义：`mcp-tool/[id].put|delete`、`mcp-tool/install.post`、`knowledge-base/[id].put|delete` 的 404 场景改为 `responseError(..., { statusCode: 404 })`；局部验证 MCP/Knowledge Base handler 测试 46 个通过，相关 handler 与测试 ESLint 通过。
- 已清理最后 4 处旧错误响应语义：`billing/[id].get`、`billing/generate.post`、`api-log/cleanup.post`、`member/[id].delete` 的 403/404 场景改为 `responseError(..., { statusCode })`；局部验证 Billing/Admin/API Log/Member handler 测试 25 个通过，相关 handler 与测试 ESLint 通过。
- 当前 `server/api/aigate` 中 `responseSuccess(..., 4xx)` 旧错误写法已归零。
- 已补齐 OpenAPI 统一错误响应契约：新增 `ErrorResponse` schema 与 `BadRequest`、`Unauthorized`、`Forbidden`、`NotFound`、`Conflict`、`ServerError`、`ErrorResponse` 公共 responses，并为 95 个 operation 补齐 default 错误响应。
- 已增强 `scripts/verify-openapi-coverage.mjs`，`pnpm test:openapi` 会同时校验路由覆盖、错误组件和每个 operation 的 default 错误响应；当前校验通过，paths=64、operations=95。
- 已抽取前端 `$request` 错误判定与 401 跳转判定纯函数，并新增 `test/request-error.test.ts` 覆盖业务错误响应、错误文案 fallback、401 重定向条件和网络错误消息归一化；局部测试 5 个通过，相关文件 ESLint 通过。
- 仍需逐页面补齐 error、forbidden、not-found 可见状态与重试入口验证。

#### P0-3. OpenAPI schema 粒度不足

问题：
历史问题为 `docs/openapi.json` 只登记 16 条路径，而实际 API 文件约 87 个。当前路径与 operation 覆盖已补齐，但 schema 粒度仍不足。

影响：
外部接入、网关协议、自动化测试、前后端协作缺少可信契约。

验收：

- 所有对外/前端依赖 API 都进入 OpenAPI。
- 每个路径包含认证要求、请求参数、响应结构、错误响应。
- `/docs/api` 不依赖不稳定 CDN，或提供本地 fallback。
- 新增 API 有自动校验，防止 OpenAPI 漏登记。

当前进展：

- `docs/openapi.json` 已扩展到 paths=64、operations=95，当前 `server/api/aigate`、`server/api/gateway`、`server/api/system-settings` 非测试路由 operation 级 missing=0。
- `/docs/api` 已改为本地 OpenAPI 浏览器，直接读取 `/api/openapi` 渲染路径、方法、标签和认证标记，不再依赖 `unpkg`/Swagger UI CDN。
- 已新增 `scripts/verify-openapi-coverage.mjs` 与 `pnpm test:openapi`，用于防止新增 API 漏登记。
- 已增强 `scripts/verify-openapi-coverage.mjs`：除路径/operation 覆盖、错误响应组件和 default 错误响应外，现在硬性校验成功响应 schema 与 requestBody schema，并输出通用成功响应 schema 的剩余数量；可通过 `OPENAPI_STRICT_SCHEMAS=1` 将通用成功响应升级为失败门禁。
- 已为员工门户、配额审批、Agent、Prompt、Channel、Knowledge Base、MCP Tool、Alert 核心接口补齐具体 schema：`/aigate/me/*`、`/aigate/quota/request*`、`/aigate/agent*`、`/aigate/prompt*`、`/aigate/channel*`、`/aigate/knowledge-base*`、`/aigate/mcp-tool*`、`/aigate/alert*`。当前 `pnpm test:openapi` 输出 detailed success schemas=52、generic success responses=43。
- 已继续为 API Key、Search、Dashboard、Organization、Billing、API Log、Gateway、Member、Model、Role、系统设置、Prompt import/export 等剩余接口补齐具名成功响应 schema；当前 `pnpm test:openapi` 输出 detailed success schemas=95，通用成功响应已清零。
- `OPENAPI_STRICT_SCHEMAS=1 pnpm test:openapi` 已通过，可将严格模式纳入 CI 防止回退到通用 `ApiResponse` / `PaginatedResponse`。

#### P0-4. 迁移状态不一致

问题：
迁移目录包含 `0007_comments_and_missing_tables.sql`、`0010_phase3_extra_indexes.sql` 等文件，但 `_journal.json` 当前只登记到 `0009_phase2_phase3_schema`，未登记 `0007` 和 `0010`。

影响：
新环境按 Drizzle journal 迁移可能漏表、漏索引或依赖补充脚本，发布风险高。

验收：

- 明确 Drizzle 迁移与补充 SQL 的唯一执行路径。
- `_journal.json`、迁移文件、`scripts/apply-all-migrations.mjs` 状态一致。
- CI 在临时数据库上从零执行迁移并校验核心表存在。

当前进展：

- 已明确执行路径：Drizzle 只负责 `_journal.json` 中登记的迁移；历史未登记但必须保留的 SQL 统一由 `scripts/apply-all-migrations.mjs` 在 Drizzle migrate 后幂等执行。
- `scripts/verify-migration-consistency.mjs` 已校验 journal、SQL 文件与补充脚本引用一致；当前结果为 9 个 journaled migrations、12 个 SQL 文件、3 个 supplemental unjournaled SQL。
- `scripts/apply-all-migrations.mjs --dry-run` 已列出 5 个补充 SQL 文件、64 条语句、34 个必检关系对象，并新增列级校验：`api_key.role_ids`、`api_log.agent_id`、`quota_change_log.decision_status`。
- `.github/workflows/ci.yml` 的 `migrations` job 已在 PostgreSQL 16 service 中执行 `verify-migration-consistency`、补充迁移 dry-run、`drizzle-kit migrate` 与补充迁移实际应用。
- 本机缺少 Docker/psql，无法直接复刻临时 PostgreSQL；需以 CI service 或可用数据库环境作为最终从零迁移证明。

#### P0-5. 角色权限没有完整落地到 UI

问题：
UI 设计规范要求按 5 类角色裁剪。当前 Vue 页面未发现 `data-roles` / `applyRole`，实际依赖菜单/路由/API 鉴权；按钮级裁剪与当前用户菜单树裁剪已建立基础，但数据切片级权限、关键 API 403 和 5 类角色 E2E 仍需系统化验证。

影响：
普通员工、项目负责人、部门负责人、分公司管理员、集团管理员看到的入口与操作可能不符合 PRD。

验收：

- 明确 Vue 版本的权限裁剪机制，不必照搬静态原型的 `data-roles`，但必须有等价实现。
- 页面按钮、批量操作、详情入口、导出入口均按角色裁剪。
- E2E 覆盖 5 类角色的关键页面可见性与 API 403。

当前进展：

- 已建立 Vue 侧等价机制：`useUiAuthorization` + `v-permission`，基于服务端返回的菜单树和 `menu.permissions` 位图判断当前路径上的按钮权限。
- 已在 Agent、Channel、Prompt、API Key、MCP Tool、Knowledge Base、Alert Rule 等高频管理页接入新增、编辑、删除、批量删除、导入/导出、健康检查等关键入口的权限裁剪。
- 已补齐默认菜单 seed 中 Agent、Prompt、MCP Tool、Knowledge Base、Channel、API Key、Quota Request 等关键页面的可用权限位；`seedDefaultMenus` 会在非空菜单表中仅回填仍为 0 的默认权限，不覆盖已配置权限。
- 已增强 `canUseMenuPermission` 的路径匹配：详情页或子页可继承最近叶子菜单权限，避免 `/aigate/channels/{id}`、`/aigate/alerts/rules` 等页面因没有精确菜单路径而隐藏操作。
- 已新增 `test/ui-authorization.test.ts` 覆盖纯权限判断逻辑、子路径继承和默认菜单权限位；局部验证 `pnpm exec vitest run test/ui-authorization.test.ts server/utils/__tests__/default-menus.test.ts --reporter=dot` 通过，13 个测试通过。
- 已将 `/api/system-settings/menu-manage` 的 GET 分支改为：管理员返回全量 enabled 菜单；非管理员按当前用户 `user_role` / `role_menu` 聚合授权菜单，菜单权限位按多角色 OR 合并，并只返回被授权菜单及父级容器。
- 已新增 `server/api/system-settings/__tests__/menu-manage-handler.test.ts` 覆盖管理员全量菜单、非管理员授权菜单裁剪、多角色权限位聚合和无角色空菜单；已在 `getRequestPrincipal` 中暴露 `roleIds` 并补充上下文测试断言。
- 已收紧 `matchApiRoute` 路由边界：只匹配精确路径或 `/` 子路径，避免 `/api/authentication` 被误判为 `/api/auth` 公共路由、`/api/aigate/api-key-extra` 被误判为 API Key 管理路由；保留 `/api/_` 内部资源前缀例外。
- 已补齐关键 admin API 的 403 策略断言，覆盖 Organization、API Key、Channel、Member、User Manage、Role Manage、Operation Log 等非管理员访问禁止场景，以及 public/authenticated/admin 相似前缀边界。
- 已修复 Billing 与 API Log 列表的组织数据切片：管理员可全量查询；非管理员必须按 `organizationId` 过滤，缺少组织上下文时返回 403，避免普通用户退化为全局查询。
- 已补充 `billing-handlers.test.ts` 与 `query-handlers.test.ts` 覆盖账单/API 日志的组织内查询、管理员全量查询和无组织普通用户 403。
- 已收紧 Member 写操作数据切片：新增成员时非管理员必须有组织上下文且不得显式写入其它组织；删除成员时非管理员必须按当前组织过滤，缺少组织上下文返回 403，管理员保留跨组织操作能力。
- 已补充 `member-handlers.test.ts` 覆盖成员新增/删除的组织内操作、跨组织 403、无组织 403 与管理员跨组织操作。
- 已为 Organization list/tree/create/update 四个 handler 补齐 admin guard，避免绕过中间件直接调用时读取或修改组织树；相关直接 handler 测试均已补充 admin 成功路径与非管理员 403。
- 已补充 `organization-handlers.test.ts` 与 `misc-handlers.test.ts` 覆盖组织树读取、组织创建/更新的管理员限制。
- 已为管理端 API Key list/create/update/delete 四个 handler 补齐 admin guard，个人自助密钥继续通过 `/aigate/me/api-key` 独立接口；管理端直接 handler 测试已补齐非管理员 403，个人密钥测试继续通过。
- 已为管理端 Channel list/create/detail/update/delete/health-check/stats handler 补齐 admin guard，与 `/api/aigate/channel` admin-only 路由策略保持一致；旧的无组织/跨组织直接 handler 成功语义已改为非管理员 403，管理员成功与 404 路径继续覆盖。
- 已收紧 Knowledge Base list/create/update/delete 与 documents list/upload/delete 的组织隔离：管理员可全量或跨组织操作；非管理员必须有组织上下文，且不得读取、创建、更新、删除其它组织知识库或文档。
- 已补充 `knowledge-base-handlers.test.ts` 覆盖无组织 403、跨组织 403、管理员全量/跨组织能力，以及文档读取/上传/删除的组织校验。
- 已收紧 Agent、Prompt、MCP Tool 的组织隔离：管理员保留全量/跨组织能力；非管理员必须有组织上下文，列表/详情/更新/删除/导入导出/安装/健康检查按组织收敛，且不得显式创建或转移到其它组织。
- 已补充 Agent chat 的组织边界：`sendAgentMessage` / `streamAgentMessage` 读取 Agent 配置时按当前 principal 过滤，避免知道其它组织 Agent ID 后绕过列表权限直接调用。
- 已补充 Agent、Prompt、MCP Tool handler 测试覆盖无组织 403、跨组织写入 403、管理员例外与组织内成功路径；局部验证 7 个测试文件、86 个测试通过。
- 仍需完成：补齐 5 类角色的浏览器 E2E，以及继续抽样复核其它余下业务模块的数据切片级权限。

### P1：核心功能缺口

#### P1-1. 四级配额与审批闭环不足

PRD 要求集团、分公司、部门、员工四级配额，且支持配额申请审批、守恒分配、阈值预警。当前 schema 有组织级 `tokenLimit/tokenUsed`，但缺少完整配额池、审批流、配额变更审计、员工级配额视图。

验收：

- 新增配额池、配额申请、审批记录、配额变更流水。
- 支持父子级配额守恒校验。
- 员工可发起申请，负责人可审批，管理员可追踪。

当前进展：

- 已在 `server/utils/quota.ts` 建立后端纯逻辑基座：配额申请草稿校验、审批决定草稿校验、父子级配额守恒校验、不能低于已使用量校验。
- 已新增 `quota_request`、`quota_change_log` 迁移与 schema，纳入 `apply-all-migrations.mjs` 和迁移一致性校验。
- 已新增 `/api/aigate/quota/request` 列表/申请接口与 `/api/aigate/quota/request/{id}/decision` 审批接口；审批通过前会执行配额守恒校验，通过后更新组织配额并写入变更流水。
- 已补充 `server/utils/__tests__/quota.test.ts` 与 `server/api/aigate/__tests__/quota-request-handlers.test.ts`，局部验证 28 个测试通过。
- 已补充 OpenAPI，`pnpm test:openapi` 覆盖校验通过，当前 expected operations=95。
- 已在 `/aigate/my-workbench` 增加员工配额申请入口与“我的配额申请”列表；已新增 `/aigate/quota-requests` 配额审批页，管理员与组织负责人可查看待审批申请并通过/拒绝。
- 已增强配额申请列表 API，返回组织名称、申请人姓名和邮箱；审批页优先显示可读名称，保留 ID 作为兜底。
- 已新增配额审批授权矩阵：`admin` 可审批全部申请；`owner`、`manager`、`group_admin`、`company_admin`、`department_admin`、`team_admin` 可审批自己组织内非本人发起的申请；普通员工只能查看/提交自己的申请。
- 配额申请列表返回 `canDecide`，前端据此裁剪审批按钮；审批接口服务端再次校验组织、角色和禁止自审。
- 已为 `quota_change_log` 增加 `decision_status`，审批通过和拒绝都会写入结构化审计流水；拒绝时保留前后配额相同，审批通过时记录真实前后配额。
- 已补充 `server/utils/__tests__/quota-authorization.test.ts` 与配额审批 handler/配额审计测试，局部验证 36 个配额相关测试通过。
- 已增强配额阈值预警后端检测：支持 70/90/100 三档阈值，100% 升级为 critical；告警 `resourceId` 按组织和阈值分档，避免 70% 未读告警挡住后续 90%/100% 升级。
- 已新增阈值预警规则模板与通知渠道联动：`alertRuleTemplates` 统一前后端默认值，告警规则页面可选择模板并自动填充类型、阈值和通知渠道；规则告警按 `notifyChannels` 决定是否发送邮件。
- 相关验证：告警规则模板、告警规则 handler、告警扩展 handler、告警工具与集成测试共 52 个测试通过；当前范围 ESLint 通过；`pnpm test:openapi` 通过。

#### P1-2. 员工门户缺失

PRD 明确普通员工需要自助查用量、密钥状态、可用 Agent。当前主要是管理控制台页面，没有独立“我的工作台/我的密钥/我的用量”闭环。

验收：

- 普通员工登录默认进入工作台。
- 展示个人配额、调用趋势、可用密钥、可用 Agent、相关告警。
- 员工只看到自己的调用日志和密钥。

当前进展：

- 已新增 `/api/aigate/me/workbench`，按当前 `principal.userId` 聚合个人调用汇总、近 7 天趋势、个人 API Key、可用 Agent、相关告警，并按 `organizationId` 返回组织配额。
- 已新增 `/aigate/my-workbench` 页面，展示个人配额、用量摘要、近 7 天用量、我的密钥、可用 Agent、相关告警。
- 已在我的工作台补充配额申请弹窗和个人申请记录，员工可直接发起配额调整申请并查看审批状态。
- 已新增默认菜单入口 `menu-workspace-my`，位于工作台分组，路由为 `/aigate/my-workbench`。
- 已新增默认菜单入口 `menu-workspace-quota-requests`，位于工作台分组，路由为 `/aigate/quota-requests`。
- 已新增 `/api/aigate/me/api-log`，强制按当前 `principal.userId` 限定个人调用日志，并支持分页、模型、Agent、状态筛选。
- 已新增 `/aigate/my-api-logs` 个人调用日志页面和默认菜单入口 `menu-workspace-my-api-logs`，我的工作台可跳转查看明细。
- 已将登录、注册、Magic Link、OAuth 的默认回调入口统一到 `/aigate/my-workbench`；已登录用户访问 `/` 或认证页时也会回到我的工作台。
- 已新增 `/api/aigate/me/api-key` 个人密钥列表/创建接口与 `/api/aigate/me/api-key/{id}` 更新接口，所有读写均按当前 `principal.userId` 限定；员工可创建、编辑、撤销自己的密钥。
- 已新增 `/aigate/my-api-keys` 页面和默认菜单入口 `menu-workspace-my-api-keys`，展示密钥生命周期、状态、到期时间、最后使用、调用次数、费用、日限额和 IP 白名单；我的工作台可跳转管理。
- 已补充 OpenAPI，`pnpm test:openapi` 覆盖校验通过，当前 expected operations=95。
- 已补充 `server/api/aigate/__tests__/me-workbench-handler.test.ts`，局部验证未登录 401 与工作台聚合响应通过。
- 已补充 `server/api/aigate/__tests__/me-api-log-handler.test.ts`，局部验证未登录 401 与个人日志仅返回当前用户数据通过。
- 已补充 `server/api/aigate/__tests__/me-api-key-handler.test.ts`，局部验证未登录 401、个人列表、创建绑定当前用户/组织、撤销仅命中当前用户密钥通过。
- 员工门户 MVP 已形成：默认进入我的工作台，支持个人用量、个人日志、个人密钥生命周期、配额申请和审批状态查看。

#### P1-3. 知识库仍偏文档管理，缺少真正 RAG 闭环

当前 schema 有 `knowledgeBase`、`document`，API 支持上传文档记录，但 PRD 要求解析、分块、向量化、语义搜索、文档级权限、与 Agent 绑定并回答时标注引用来源。

验收：

- 文档上传后进入处理队列，记录解析/分块/向量化状态。
- 接入向量存储或明确本地/外部向量方案。
- 支持语义搜索 API。
- Agent 回答返回引用来源与文档片段。

#### P1-4. Agent 体系缺少管理 Bot 与可信对话体验

当前已有 Agent CRUD、聊天、历史会话和流式能力雏形，但 PRD 要求 AiGate Bot 查询运营数据、项目 Agent 绑定知识库与 MCP、权限隔离、工具调用步骤、引用溯源。

验收：

- AiGate Bot 作为内置管理 Agent 固定入口。
- Bot 查询严格按当前 principal 权限收敛。
- 项目 Agent 创建向导支持绑定知识库、Prompt、MCP 工具。
- 聊天界面展示流式响应、引用来源、工具调用步骤、Token/费用估算。

#### P1-5. MCP 资产市场缺少完整资产治理

当前有 MCP 工具、版本、marketplace preset、安装与测试 API，但还缺少公共/私有市场、授权、计量、健康历史、版本发布/回滚、资产依赖和审核流。

验收：

- 市场支持公共/私有 Tab、工具详情、安装/授权范围。
- 内部工具支持版本发布、回滚、健康历史。
- 调用日志能按 MCP 工具维度归因。
- 资产变更进入操作审计。

#### P1-6. 告警与通知处置不足

已有 alert 与 alertRule，但 PRD 要求 70/90/100 配额、密钥到期、异常调用、MCP 异常、Agent 异常、知识库处理失败等多场景预警，并支持邮件/企微/钉钉/Webhook 通知与自动处置。

验收：

- 预警规则覆盖 PRD Must 场景。
- 通知渠道可配置并可测试。
- 告警详情展示触发原因、影响范围、处置记录。
- 自动处置支持限速、临时封禁、提醒。

当前进展：

- 已补充配额 70/90/100 三档预警与密钥到期规则检测，内置检测默认走邮件通知。
- 已新增规则模板与通知渠道归一化逻辑，创建/更新告警规则时会补齐模板默认阈值和 `notifyChannels`。
- 已在告警规则页面加入模板选择和通知渠道多选，选择模板会联动类型、阈值、渠道和默认名称。
- 当前通知执行层已支持 `email` 与 `in_app` 的基础分流：`in_app` 只生成站内告警，包含 `email` 时再发送邮件。
- 仍未完成：企微/钉钉/Webhook 渠道配置与测试、告警处置记录、自动处置策略、异常调用/MCP/Agent/知识库处理失败等更多场景。

#### P1-7. 月报、成本分摊和导出水印缺失

BRD/PRD 强调用量报告、费用分摊、财务导出。当前有 billing 与 api-log，但月报自动生成、部门/员工/模型/MCP 下钻、Excel/PDF 导出水印仍需补。

验收：

- 每月自动生成报告。
- 支持部门、员工、模型、MCP、日期维度下钻。
- Excel/CSV/PDF 导出含租户、操作人、时间水印。
- 导出操作写审计日志。

### P2：体验与工程补强

#### P2-1. 危险操作二次确认不一致

部分页面直接删除，如 Agent、Prompt、Channel、Knowledge Base、MCP、Alert Rule 等，需要统一二次确认。批量删除虽然可复用 `useBatchOperations`，但单项危险操作仍不一致。

验收：

- 吊销密钥、删除知识库、下线 MCP/Agent、批量删除均二次确认。
- 高风险批量操作要求输入确认词。
- 所有写操作进入操作审计。

当前进展：

- API Key、Agent、MCP Tool、Knowledge Base、Knowledge Base Document、Alert Rule、Channel 详情删除已从直接删除或浏览器原生 `confirm()` 改为 `useConfirmDialog` 二次确认，确认后才调用删除接口。
- 批量删除继续复用 `useBatchOperations` 的统一确认弹窗，并在已接入页面补充 `v-permission="'BATCH_DELETE'"`。
- 已用搜索确认 `app/pages/aigate` 与 `app/pages/system-settings` 中不再存在 `if (!confirm(...))`、`window.confirm`、`confirm(p(...))` 这类原生确认调用。
- 仍未完成：高风险批量操作确认词；写操作审计覆盖率复核；更多非删除型危险操作（如下线、封禁、重置）逐页复核。

#### P2-2. 页面错误状态不足

页面普遍有 `TableSkeleton` 与 `EmptyState`，但网络错误、权限不足、资源不存在的可见错误态不完整。

验收：

- 每个异步页面有 loading、empty、error、forbidden、not-found 至少一种明确落点。
- 错误态提供重试或返回。

#### P2-3. 筛选、分页、列设置、数据时效未系统化

UI 规范要求筛选与 URL 同步、表格偏好持久化、最后更新时间展示。当前列表页多为本地 ref，尚未统一。

验收：

- 列表页分页、筛选、排序进入 URL query。
- 表格列设置、密度、筛选偏好进入 localStorage。
- 实时/准实时页面展示最后更新时间。

#### P2-4. OpenAPI 文档页依赖外部 CDN

`app/pages/docs/api.vue` 通过 `https://unpkg.com/swagger-ui-dist` 加载 CSS/JS，历史审计出现 `ERR_CONNECTION_CLOSED`。

验收：

- 使用本地依赖或构建产物加载 Swagger UI。
- 外网失败不影响 API 文档页可用性。

当前进展：

- 已移除 `https://unpkg.com/swagger-ui-dist` CSS/JS 引用，改为本地 Vue 渲染 OpenAPI 文档列表；外网失败不再影响 `/docs/api` 基础可用性。

#### P2-5. 类型债务

当前仍存在 `any`、`as any`、`catch (err: any)`、泛型 `Record<string, any>` 等类型债务，集中在 gateway、mcp-health、useRequest、系统设置接口、页面编辑数据等。

验收：

- `server/utils/gateway.ts`、`server/utils/index.ts`、`useRequest.ts`、核心页面移除不必要 `any`。
- 对外 API DTO 和数据库实体类型统一导出。
- lint 增加 no-explicit-any 的阶段性门槛。

## 4. 缺失功能总表

| 模块     | 当前状态                                                                                            | 缺失功能                                                         | 优先级 |
| -------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| 统一网关 | 有 OpenAI 兼容代理、API Key 校验、限额、速率限制雏形                                                | 多供应商协议适配、模型级路由、权重负载、失败重试、真实流式审计   | P1     |
| 密钥管理 | 有管理端 CRUD、员工自助密钥、scope、roleIds、IP 白名单字段                                          | 生命周期时间线、到期提醒、批量吊销确认、泄露检测                 | P1     |
| 配额管理 | 已有组织 token 字段、申请审批流、守恒校验、负责人审批授权、审批审计流水、阈值规则模板和通知渠道联动 | 员工级配额池模型、跨层级分配入口继续完善                         | P1     |
| 用量看板 | 有 dashboard API/页面                                                                               | 数据时效、自动刷新、指标解释、下钻、导出                         | P2     |
| 组织治理 | 有组织树和成员管理                                                                                  | 组织 CRUD 完整入口、配额分配、组织层级权限、离职处理向导         | P1     |
| MCP 市场 | 有工具 CRUD、preset、版本页                                                                         | 公共/私有市场、授权矩阵、调用计量、审核、健康历史、回滚          | P1     |
| 知识库   | 有知识库/文档表和页面                                                                               | 解析、分块、向量化、语义搜索、文档级权限、引用溯源               | P1     |
| Agent    | 有 CRUD/聊天/历史                                                                                   | AiGate Bot、创建向导、资产绑定、工具调用步骤、引用来源、权限解释 | P1     |
| Prompt   | 有 CRUD、版本、导入导出                                                                             | 变量表单化、沙箱测试、审批上架、A/B 版本流量                     | P2     |
| 告警通知 | 有 alert/rule、基础规则模板、站内/邮件渠道联动                                                      | 企微/钉钉/Webhook、自动处置、处置历史、更多异常场景              | P1     |
| 计费报告 | 有 billing                                                                                          | 月报自动生成、财务导出、水印、部门分摊、MCP 维度                 | P1     |
| 员工门户 | 已有我的工作台、我的用量、个人日志、我的密钥生命周期和默认登录入口                                  | 员工侧体验继续按页面错误态与 URL 状态同步完善                    | P2     |
| 系统设置 | 有系统管理模块                                                                                      | 聚合配置中心、SSO、安全策略、审计保留、通知渠道                  | P2     |
| 操作审计 | 有 logs                                                                                             | 不可篡改说明、所有写操作覆盖、导出审计、审计保留策略             | P1     |
| 开放文档 | OpenAPI 路径/operation 覆盖已补齐，错误模型与具名成功响应 schema 已统一                              | 认证说明、字段约束、示例继续细化                                 | P1     |

## 5. 优化计划

### Phase 0：质量基线与契约修复，1 周

目标：
先让系统可被可靠验证，避免后续功能建设在不稳定基础上扩张。

任务：

1. 在 CI Ubuntu + Node 20 环境复验 `pnpm build`，确认 build job 可稳定完成；本地 Windows Nitro 超时已通过平台化配置规避。
2. 将已恢复通过的 lint、Nuxt typecheck、server typecheck、OpenAPI 与 Vitest 继续保持为稳定 CI job，并继续优化耗时。
3. 统一 API 错误响应、HTTP status、前端 `$request` 错误处理。
4. 修复迁移执行路径，确保新数据库可从零迁移。
5. OpenAPI 至少覆盖所有 `/api/aigate` 与 `/api/gateway` 核心接口。
6. 建立页面审计命令的稳定输出，修复登录测试选择器与 Origin 问题。

交付物：

- 质量门禁运行报告。
- OpenAPI v1 完整草案。
- API 错误语义规范。
- 迁移一致性验证脚本。

### Phase 1：权限、员工端与配额闭环，2 周

目标：
补齐企业管控平台的最小闭环：谁能用、能用多少、超额如何申请、谁审批。

任务：

1. 建立 Vue 版角色/权限裁剪机制和 E2E 覆盖。
2. 新增员工工作台：个人密钥、个人用量、个人告警、可用 Agent。
3. 建立配额池、审批流、配额变更流水。
4. 组织治理页面补齐创建、编辑、删除、配额分配、成员入口。
5. 密钥管理补生命周期时间线、到期提醒、吊销确认。

交付物：

- 员工端 MVP。
- 配额审批 MVP。
- 5 类角色权限矩阵测试。

### Phase 2：RAG、Agent、MCP 资产治理，3 周

目标：
让 v2.0 的资产层与智能层从“页面可见”变成“业务可用”。

任务：

1. 知识库处理队列：上传、解析、分块、向量化、失败重试。
2. 语义搜索 API 与 Agent 引用溯源。
3. Agent 创建向导：绑定知识库、Prompt、MCP、成员权限。
4. AiGate Bot 管理查询入口，严格按权限查询运营数据。
5. MCP 公共/私有市场、授权矩阵、健康历史、版本发布/回滚。

交付物：

- 项目知识库 + Agent 对话闭环。
- AiGate Bot MVP。
- MCP 资产市场 MVP。

### Phase 3：告警、审计、计费与报表，2 周

目标：
补齐商业化、财务和合规能力。

任务：

1. 扩展通知渠道配置：企微、钉钉、Webhook 测试与失败重试。
2. 自动处置：限速、临时封禁、提醒。
3. 操作审计覆盖所有写操作，导出审计日志。
4. 月度费用分摊报告，支持部门/员工/模型/MCP 下钻。
5. 导出水印与 PDF/CSV/Excel 导出规范。

交付物：

- 告警处置闭环。
- 审计与导出合规闭环。
- 月报 MVP。

### Phase 4：UI 规范与体验收口，2 周

目标：
把管理控制台提升到稳定可交付的产品体验。

任务：

1. 每页补齐 loading、empty、error、forbidden、not-found 状态。
2. 危险操作统一二次确认和确认词。
3. 列表筛选、分页、排序 URL 同步。
4. 表格列设置、密度、筛选偏好 localStorage 持久化。
5. 数据大盘、日志、告警增加数据时效与刷新策略。
6. `/docs/api` 改为本地 Swagger UI 或可用 fallback。
7. 响应式、可访问性、中文文案、Lucide 图标逐页走查。

交付物：

- UI 设计规范逐页检查报告。
- 页面审计 0 FAIL。
- 核心列表统一交互组件。

### Phase 5：生产化与商业化准备，2 周

目标：
让系统具备可部署、可监控、可销售、可支持的基础。

任务：

1. 持续维护 `.github/workflows` 与部署文档一致，确保 build、migration、e2e 都有可复现的 CI 输出。
2. 生产环境迁移、构建、镜像、健康检查、回滚流程演练。
3. Sentry/APM/业务指标监控接入。
4. SSO、白标、通知渠道、安全策略、审计保留进入系统设置。
5. 完善用户手册、开发者接入指南、运维手册。

交付物：

- CI/CD 可信流水线。
- 生产部署演练报告。
- 商业化功能清单与缺口复核。

## 6. 验收标准

### 系统级

- 页面审计：核心页面 0 个 500，0 个控制台致命错误。
- API 契约：OpenAPI 覆盖所有前端依赖 API。
- 权限：5 类角色关键页面与 API 权限测试通过。
- 质量门禁：lint、typecheck、unit、e2e 均有稳定命令和 CI 输出。
- 数据库：新库从零迁移成功，核心表/索引校验通过。

### 产品级

- 员工能独立完成：登录、查看用量、创建/查看密钥、访问授权 Agent。
- 管理员能独立完成：组织配额分配、密钥吊销、渠道配置、告警处理、月报导出。
- 项目负责人能独立完成：创建知识库、上传文档、创建 Agent、绑定知识库与 MCP、授权成员。
- 审计/财务能独立完成：查看调用日志、导出水印报告、追踪操作记录。

## 7. 风险与建议

1. 不建议继续堆功能后再治理质量门禁。当前门禁和 Windows 本地 build 已恢复，但构建耗时偏高、CI build 尚待复验，会放大每次改动风险。
2. 不建议把 PRD 中 RAG/Agent/MCP 只做成列表 CRUD。它们是 v2.0 的核心价值，必须形成“资产授权 + 调用计量 + 审计 + Agent 消费”的闭环。
3. 不建议继续维护多份状态不一致的计划文档。旧 `2026-06-04-aigate-comprehensive-optimization-plan.md` 存在乱码与过期结论，应以本文档为当前审计基线。
4. `.github/workflows` 已确认存在并补齐一版 CI；当前需优先复验 `pnpm build` 在 Ubuntu + Node 20 CI 环境中的结果，否则新增 build job 仍可能成为 CI 阻断点。

## 8. 下一步推荐

从 Phase 0 继续，先做 3 件事：

1. 验证 Ubuntu + Node 20 CI 等价环境能否稳定完成 `pnpm build`，并根据 CI 结果决定是否需要进一步外部化大依赖或拆分构建。
2. 继续逐页补齐 error、forbidden、not-found 和重试入口。
3. 校准迁移路径与 CI，保证新环境可从零启动并自动校验。

完成后再进入员工门户、配额审批、RAG/Agent/MCP 等核心业务补齐。
