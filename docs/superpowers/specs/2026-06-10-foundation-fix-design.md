# 阶段 0+1：地基修复与底座收敛 设计 spec

> 日期：2026-06-10
> 总纲：`2026-06-10-aigate-v2-roadmap-overview.md`
> 目标：消灭「CRUD 显示成功但看不到数据」的全部根因；登录精简为用户名+密码；建立显式租户上下文。本阶段不新增业务功能。

---

## 范围

**范围内**：WP1-WP7（见下）。
**范围外**：租户套餐/过期/账号配额、网关渠道升级、MCP 市场重构、知识库/Skills/Agent 重构、UI 主题改版。

---

## WP1 假成功修复（系统性）

**现状**：`server/utils/index.ts:90-95` 的 `responseError` 通过 `tryUseEvent()` 设置 HTTP 状态码，但 `nuxt.config.ts` 未开启 nitro `asyncContext`，`useEvent()` 抛错被吞，所有错误响应实际为 HTTP 200（body 内 code=400/403/500）。`app/plugins/request.ts:27-38` 的 `onResponse` 检测到 `code !== SUCCESS` 只弹错误 toast，不 throw，Promise 正常 resolve。页面普遍采用 `await insertX(); successToast()` 模式，失败时照样弹成功。

**设计**：

1. `nuxt.config.ts` 开启 `nitro.experimental.asyncContext: true`，使 `responseError` 正确设置 HTTP 状态码。
2. `app/plugins/request.ts` 在 `code !== SUCCESS` 时弹错误 toast 后 **throw**（构造含 code/message 的 Error），使页面 `await` 中断，后续 `successToast()` 不执行。
3. 同时处理 `onResponseError`（HTTP 非 2xx 路径）：弹错误 toast 并保持 reject，避免开启 asyncContext 后错误走到另一分支被静默。
4. 修正 `server/middleware/auth.ts:26` 用 `responseSuccess(null, msg, FORBIDDEN)` 返回 403 的错误用法，改为 `responseError`。
5. 全局兜底：页面级未 catch 的 throw 由 Nuxt 全局错误钩子捕获，不出现白屏（toast 已在插件层弹出，钩子仅吞掉重复上报）。

**影响面**：所有 `await xxxApi(); successToast()` 页面（members、api-keys、prompts、channels、alerts 等）行为自动变正确，无需逐页改造；个别页面如有「失败也要继续」的逻辑需局部 try/catch（实施计划阶段逐页排查）。

**验收**：服务端 Zod 校验失败时，Network 面板显示 4xx；前端只弹错误 toast，不弹成功；弹窗不关闭。

## WP2 缓存失效（系统性）

**现状**：`app/composables/useRequest.ts:16, 84-96` 模块级 `responseCache`，列表 GET 带 60s `staleTime`（`useAigateApi.ts:70-79`）。写操作成功后页面 `refresh()` 仍命中旧缓存，新数据最长 1 分钟不可见。

**设计**：

1. `useRequest.ts` 增加 `invalidateCache(prefix: string)`：删除所有 key 以该前缀开头的缓存条目（缓存 key 含 URL + 序列化参数，按 URL 前缀匹配）。
2. `post/put/delete` 成功返回后，自动以请求 URL 的资源前缀失效缓存。前缀提取规则：取 URL 路径去掉末尾的 `/[id]` 段（如 `/api/aigate/channel/3` → `/api/aigate/channel`）。
3. 提取规则覆盖不到的跨资源场景（如配额审批通过影响 organization 数据），由调用方显式传入额外失效前缀：`post(url, data, { invalidates: ['/api/aigate/organization'] })`。

**验收**：任一列表页新增/删除后，`refresh()` 立即显示新数据，无需等待 60 秒。

## WP3 单点 CRUD 修复

| #   | 问题                                                                                                                      | 设计                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | 渠道新增必失败：`schema.ts:341` `vendorTag` 必填，表单无此字段                                                            | `channels/index.vue` 表单与弹窗模板补 `vendorTag` 输入（文本框，必填校验与 insertChannelSchema 对齐）                                                                               |
| 3.2 | 组织 GET 返回树，`members/index.vue:45-48`、`dashboard/organization.vue:16-19` 读 `.items` 恒空                           | `organization/index.get.ts` 支持 `?flat=1` 返回 `{ items, total }` 扁平结构；默认仍返回树（organizations 页继续用）。两个读 `.items` 的页面改调 `?flat=1`                           |
| 3.3 | 组织新增/编辑 UI 缺失（`dashboard/organization.vue` 设 `open.value=true` 但模板无 Modal；`insertOrg/updateOrg` 无人调用） | `dashboard/organization.vue` 补 UModal 表单（名称/类型四级/父节点/Token 配额），接通 `insertOrg/updateOrg`，沿用项目现有弹窗表单模式                                                |
| 3.4 | MCP 版本页恒空：`mcp-tool/index.get.ts:29-36` 不联查 `mcp_tool_version`                                                   | GET 联查版本表，按工具聚合为 `versions` 数组返回（与 `versions.vue:20,34` 期望结构对齐）                                                                                            |
| 3.5 | `ai_model` 表无数据来源，模型页必空                                                                                       | 新增 `model` 的 POST/PUT/DELETE 端点（drizzle + zod，组织回填与权限模式照抄 channel 端点）；`models/index.vue` 从只读改为带新增/编辑/删除的标准 CRUD 页。渠道自动同步模型留给阶段 2 |

## WP4 菜单补缺与种子幂等

**现状**：`server/plugins/seed-menus.ts` 仅在 menu 表为空时写入种子；`/aigate/members`、`/aigate/dashboard/organization`、`/aigate/gateway/routes`、`/aigate/mcp-tools/marketplace`、`/aigate/mcp-tools/versions` 不在 `default-menus.ts` 种子中，已部署库不会获得新菜单。

**设计**：

1. `default-menus.ts` 补全上述 5 个菜单项（归组：members → 系统设置；dashboard/organization → 工作台；gateway/routes → 网关配置；marketplace、versions → AI 资产管理）。
2. seed 逻辑由「空表才写」改为**按菜单 code 幂等 upsert**：种子中存在而库中没有的插入；库中已有的不覆盖（保护用户自定义排序/改名）。不删除库中多余菜单。
3. 新插入的菜单自动授予 admin 角色（与现有 role_menu 机制一致）；非 admin 角色由管理员在角色管理页自行勾选。

## WP5 登录精简（用户名+密码）

**决策依据**：总纲 D4/D5。better-auth `username` 插件已启用（`server/utils/auth.ts:35`），仅页面未使用。

**设计**：

1. **登录页** `auth/sign-in/index.vue`：`signIn.email` → `signIn.username`；表单 schema（`useSchema.ts:83-90`）email 字段改 username；移除 MagicLinkButton / LoginProvides / forgot-password 链接。
2. **删除**：`auth/sign-up`、`auth/magic-link`、`auth/forgot-password`、`auth/reset-password` 四个页面目录；`auth/components/MagicLinkButton.vue`、`LoginProvides.vue`；`app/middleware/reset-password.ts`；3 个无引用邮件模板组件（`app/components/email/`）。
3. **server**：`server/utils/auth.ts` 移除 `magicLink` 插件与 `socialProviders` 配置；保留 `emailAndPassword`（username 插件底层依赖）、admin、multiSession、localization、lastLoginMethod。
4. **client**：`app/plugins/auth-client.ts` 移除 `magicLinkClient()`。
5. **用户创建**：管理员在用户管理页 `createUser` 弹窗补 username 必填字段；email 由 `用户名@aigate.local` 自动派生（user.email notNull unique 约束，不向用户展示）。`useSchema.ts` 的 `userFormSchema`（extends signUpFormSchema）同步改造，`emailFormSchema`/`forgotPasswordFormSchema` 删除。
6. **忘记密码**：登录页文案提示「联系管理员重置」；管理员用现有 `ResetPasswordModal`。
7. **依赖清理**：删除 `@vue-email/components`、`@vue-email/render`、`@faker-js/faker`；保留 `nuxt-resend`/`resend`（`server/utils/alert-notify.ts` 在用）。
8. **i18n**：`shared/i18n/default-messages.ts` 清理 magic link / 邮箱验证 / 忘记密码相关 key，新增 username 登录文案。
9. **存量数据**：已有用户的 email 不动；username 为空的存量用户由管理员补填后方可用用户名登录（过渡期 `signIn.email` 不保留——本系统尚未投产，无真实存量用户负担）。

## WP6 显式租户上下文

**决策依据**：总纲 D3。**现状**：`server/utils/context.ts:27` 取 member 表第一条 membership 作为 `organizationId`，用户多组织时不可控，admin 行为与普通用户不一致（如 `api-key/index.get.ts:24`）。

**设计**：

1. **服务端**：`getRequestPrincipal` 读取 cookie `aigate_active_org`：
   - 普通用户：校验该值在其 membership 列表内，是则用之；否则（无 cookie / 校验失败）回退第一条 membership 并不报错。
   - admin：可为任意存在的组织 id；无 cookie 时 `organizationId = null` 表示全局视角。
   - principal 增加 `memberships: string[]` 字段供切换器使用。
2. **切换端点**：`POST /api/aigate/active-organization`，校验后 `setCookie`（httpOnly, sameSite=lax, path=/）。
3. **前端**：顶栏（`app/layouts/default.vue`）新增组织切换器下拉：
   - 普通用户仅一个 membership 时不渲染；多个时显示当前组织名 + 下拉切换。
   - admin 显示「全局视角」+ 全部组织列表（搜索式下拉）。
   - 切换成功后清空全部前端缓存（调用 WP2 的 `invalidateCache('')`）并刷新当前页数据。
4. **数据隔离统一**：统一各 GET handler 的过滤约定为「`principal.organizationId` 非空则按其过滤；admin 且为空则不过滤」，修正 `api-key/index.get.ts:24` 对 admin 也强制过滤的不一致。

## WP7 测试同步

1. **e2e**：`e2e/fixtures/auth.ts`、`auth.spec.ts`、`auth.setup.ts`、`smoke.spec.ts` 改为 username 注册（经管理端 API 建用户）+ username 登录流程；删除 magic link / 忘记密码用例。
2. **vitest 回归**：
   - WP1：构造 Zod 校验失败请求，断言 HTTP 状态为 4xx 且 body code 非 SUCCESS。
   - WP2：写后读，断言列表立即包含新记录（绕过/失效缓存生效）。
   - WP6：多 membership 用户带不同 cookie 请求列表，断言数据按 activeOrganizationId 过滤；伪造非本人组织的 cookie 断言回退。
3. **手动验收清单**：渠道/组织/成员/密钥/Prompt 各做一轮增改删，列表立即可见；校验失败弹错误；用户名登录可用，已删页面 404；admin 切换组织后各列表数据随之变化。

---

## 错误处理总约定（WP1 落地后全站生效）

- 服务端：业务失败一律 `responseError`（HTTP 4xx/5xx + body `{ code, message }`）。
- 前端：插件层统一弹错误 toast 并 throw；页面默认不 catch（让流程中断）；确需失败后继续的局部逻辑显式 try/catch。
- 禁止再出现 `responseSuccess` 携带非成功 code 的用法。

## 实施顺序

WP1 → WP2（两者是其余工作包的验证前提）→ WP3 + WP4（可并行）→ WP5 → WP6 → WP7（贯穿，每个 WP 完成即补对应测试）。

## 风险

| 风险                                                        | 缓解                                                                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ | ------ | --------------------------------- |
| WP1 throw 改变全站 Promise 行为，可能暴露隐藏的页面逻辑问题 | 实施时全局 grep `await.\*(insert                                                                                    | update | delete | remove)` 逐页核对；e2e smoke 全跑 |
| nitro asyncContext 为实验特性                               | 本项目 Node 运行时支持 AsyncLocalStorage；若有异常仅影响错误状态码路径，回退方案为在 `responseError` 显式传入 event |
| 菜单 upsert 误改用户自定义菜单                              | 仅插入缺失项，按 code 匹配，绝不更新/删除已有行                                                                     |
| username 登录上线时存量用户无 username                      | 系统未投产；如有测试账号由管理员补填                                                                                |
