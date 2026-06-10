# AiGate v2.0 实施总纲（Roadmap Overview）

> 日期：2026-06-10
> 配套文档：`docs/v2.0/AiGate_UI_Design_Spec.md`（UI 设计规范 v1.4）
> 性质：路线图与决策记录。每个阶段开工前出独立 spec，本文档不含实施细节。
> 首个子项目 spec：`2026-06-10-foundation-fix-design.md`（阶段 0+1）

---

## 一、背景与现状结论

项目基于 baiwumm 的 Nuxt 4 模板（Nuxt + better-auth + drizzle + PostgreSQL）改造为企业级 AI 管控平台。经全量代码排查得出结论：

1. **后端 CRUD 基本真实写库**，`@faker-js/faker` 是死依赖，无页面使用 mock 数据。
2. **「显示成功但看不到数据」由两个系统性 bug 叠加四个单点 bug 造成**：
   - 系统性 A：`server/utils/index.ts` 的 `responseError` 依赖未开启的 nitro `asyncContext`，所有错误实际返回 HTTP 200；`app/plugins/request.ts` 遇 `code !== SUCCESS` 只弹 toast 不 throw，页面 `await insertX(); successToast()` 在失败时照样弹成功。
   - 系统性 B：`app/composables/useRequest.ts` 的 60 秒 SWR 缓存无失效机制，写库成功后 `refresh()` 仍命中旧缓存。
   - 单点：渠道表单缺必填 `vendorTag`；组织 GET 返回树但页面读 `.items`（成员页组织下拉恒空）、组织新增/编辑 UI 缺失；MCP 工具 GET 不联查版本表；`ai_model` 表无任何数据来源；`/aigate/members` 等页面不在菜单种子里。
3. **认证体系**：better-auth 已启用 username 插件但页面未使用；magic link / 忘记密码的发邮件回调未配置（死链路）；3 个邮件模板组件零引用。
4. **多租户**：自建 `organization`（四级）+ `member` 表，业务表带 `organizationId`；但 `server/utils/context.ts` 隐式取用户第一条 membership，无租户切换能力。

## 二、五阶段路线图

| 阶段                          | 内容                                                                                                                         | spec                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **0+1 地基修复与底座收敛**    | 假成功 + 缓存失效 + 单点 CRUD 修复 + 菜单补缺 + 登录精简（用户名+密码）+ 显式租户上下文                                      | `2026-06-10-foundation-fix-design.md`（已出） |
| **2 网关渠道升级**            | cc-switch 卡片形态/预设模板/模型自动同步；9Router 多账号轮询 + Combo 回退链；CPA 凭证解耦与账号体检                          | 开工前另出                                    |
| **3 MCP 市场**                | aitmpl 卡片市场 + 详情二级页（mcpServers JSON + env 占位符表单）+ Stack 式批量下发 + 授权矩阵                                | 开工前另出                                    |
| **4 知识库 / Skills / Agent** | snail-ai 四 Tab 知识库详情（文档/切片/召回测试/问答测试）+ 文档状态机 + 存储实例抽象 + Skill 在线编辑器 + Agent 能力开关矩阵 | 开工前另出                                    |
| **5 租户深化**                | ruoyi-ai 租户套餐（= 菜单集合）+ 过期时间 + 账号配额 + 套餐变更同步                                                          | 开工前另出                                    |

依赖关系：阶段 0+1 是所有后续阶段的前提（错误链路与租户上下文）；阶段 2 的「渠道同步模型」解锁模型页数据；阶段 3/4 依赖租户授权体系；阶段 5 可与 3/4 并行。

## 三、参考项目 → 模块映射

| 参考项目              | 借鉴内容                                                                                                                                  | 落点                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **ruoyi-ai**          | 租户套餐=菜单集合、超管动态切换租户视角、租户业务字段（过期/账号配额）                                                                    | 阶段 1（切换）+ 阶段 5（套餐） |
| **snail-ai**          | RAG 详情四 Tab、文档状态机 + SHA-256 去重、存储实例抽象、Skill（SKILL.md + 文件树编辑器 + 版本自增）、Agent 五能力开关 + 中间表           | 阶段 4                         |
| **cc-switch**         | 供应商卡片 + 单选启用、卡片内配额分档色 + 重置倒计时、预设模板 + 自动拉取 /v1/models + 模型映射表                                         | 阶段 2                         |
| **9Router**           | provider/model 命名空间、命名 Combo 回退链、多账号 round-robin + 配额耗尽切换                                                             | 阶段 2                         |
| **CPA (CLIProxyAPI)** | 凭证与渠道配置解耦、管理面/数据面分离、账号体检（批量配额检测）                                                                           | 阶段 2                         |
| **aitmpl.com/mcps**   | 卡片四要素（名/分类徽章/描述/调用量）、详情页 = mcpServers JSON + 安装命令、env 占位符自动生成配置表单、Stack 批量下发、security 评分字段 | 阶段 3                         |

## 四、已确认决策记录

| #   | 决策           | 选择                                                                                                                                        |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 假成功修复方式 | 双管齐下：开启 nitro `asyncContext`（错误真正返回 4xx/5xx）+ `request.ts` 遇 `code !== SUCCESS` 时 throw                                    |
| D2  | 缓存失效方式   | `useRequest` 写操作（post/put/delete）成功后按资源 URL 前缀自动失效缓存，保留 SWR                                                           |
| D3  | 租户上下文     | 显式 `activeOrganizationId`（cookie 持久化 + membership 校验 + 顶栏组织切换器）；不迁移 better-auth organization 插件                       |
| D4  | 新用户入口     | 仅管理员建用户（admin 插件 `createUser`），删除自助注册页；忘记密码走管理员重置                                                             |
| D5  | 登录方式       | 仅用户名 + 密码（better-auth username 插件）；删除 magic link / 忘记密码 / 重置密码 / OAuth 入口与邮件链路死代码；resend 依赖保留给告警通知 |
| D6  | spec 组织      | 总纲 + 按子项目逐个出详细 spec                                                                                                              |

## 五、后续维护

每个阶段开工前：先出该阶段 spec → 用户评审 → writing-plans 出实施计划 → 实施。阶段完成后回本文档在路线图表格标注「✅ 完成 YYYY-MM-DD」。
