# AiGate Go Platform（All-in Go 重建）

## Problem

集团 IT 管理员与项目负责人同时需要把企业 AI 用得「可管、可控、可追溯」，并让每个项目拥有专属 AI 能力。现有 Nuxt 单体在网关精细化计量、多租户组织配额、项目级资产（知识库 / MCP / Skill / Agent）上能力碎片化，且与目标架构（Go 统一技术栈）不一致；继续在旧栈上叠加会放大技术债。若不重建，企业仍会面临费用失控、密钥外泄、工具滥用、知识外流与项目级智能能力缺失。

## Evidence

- 既有内部 PRD/MRD（`legacy-nuxt-aigate` 标签可回看）已定义四层能力：统一网关、管控、资产、智能。
- 产品决策确认：方案 C（All-in Go）；不以 sub2api 为唯一基座；网关参考 NewAPI 系；Agent/RAG 参考 Snail AI 能力边界；多租户参考若依式组织/RBAC 模型并用 Go 实现。
- Assumption — needs validation via 首批内部试点（集团 IT + 1～2 个真实项目负责人）访谈与用量数据。

## Users

- **Primary**：
  - 集团 / 分公司 IT 管理员 — 统一配额、密钥、审计、MCP 资产目录、配额预警与全局策略。
  - 项目负责人 — 为项目创建知识库与 Agent，授权 MCP，管理项目成员访问。
- **Secondary**：普通员工（专属密钥 + 使用项目 Agent）、财务/审计（费用分摊与日志导出）。
- **Not for**：个人开发者中转站 / 订阅拼车；私有模型微调；通用 AI 工作流编排平台。

## Hypothesis

We believe **用 Go 重建 AiGate（NewAPI 旁路网关 + 自研多租户与项目资产操作系统）** will **同时满足企业级 Token/资产管控与项目级 Agent/RAG/MCP 能力** for **集团 IT 与项目负责人**.
We'll know we're right when **内部试点中：组织配额可守恒分配且可拦截超限调用；至少一个项目 Agent 可基于项目知识库回答并引用文档；MCP 调用可鉴权、计量并进入统一审计；核心路径日调用可在用量看板上观测**。

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| 网关核心链路可用 | OpenAI 兼容转发 + Key 鉴权 + 配额拦截 P0 通过 | 集成测试 + Demo 0 冒烟 |
| 多租户隔离 | 跨租户无法读写对方项目/KB/密钥 | 权限测试用例 |
| 项目 Agent RAG | ≥1 项目可上传文档并引用回答 | Demo 2 验收 |
| MCP 资产调用 | 未授权不可调；授权可调且计入用量与审计 | API 测试 |
| 配额预警 | 用量达阈值可产生告警记录并可 webhook 通知 | 告警测试 |
| 内部验证用量 | 试点团队日均调用 > 50 次 | 用量看板 API / 控制台 |

## Scope

**MVP** — Go 模块化仓库落地：

- 租户与组织 RBAC（MVP 默认三级：租户 → 部门 → 员工；Project 作为资产容器）
- 员工 API Key、统一网关（NewAPI sidecar + AiGate 预检配额/鉴权/审计）
- 项目域、项目知识库 RAG（pgvector）、对象存储（本地路径可配）
- MCP 注册/授权/计量/健康检查（企业私有库必做；公共市场可精选启用）
- 统一审计事件、后台 Job、配额预警
- 项目 Agent + 管理 Bot 最小对话
- **前后端分离**：Go 提供 HTTP API；Vue3 SPA 控制台仅消费 API（禁止再做成 Nuxt/SSR 全栈）
- 瘦控制台（Demo 0）→ 完整管理台（Demo 3）
- 基础 docker compose 部署（api / worker / web 分服务）

**Out of scope（MVP）**

- 以 sub2api 为产品基座或订阅拼车能力
- Skill 自优化与 Skill 收费市场（里程碑 08，后置；MVP Agent 仅预留扩展点）
- 部门级 Agent、跨知识库联合搜索、SSO（企微/钉钉/LDAP）
- 模型微调 / AI 工作流编排
- 将旧 Nuxt 代码迁移式重写（快照于 `legacy-nuxt-aigate`）
- 前后端耦合的全栈渲染（Nuxt/SSR、Go 内嵌管理页作为主 UI）

## Delivery Milestones

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Go 仓库骨架与领域边界 | 可编译 Go workspace；Tenant/Org/Project 模型与迁移可跑 | complete | `.claude/plans/01-go-scaffold.md` |
| 2 | 多租户 RBAC 与身份 | 用户/角色/组织树；请求带租户上下文 | complete | `.claude/plans/02-tenant-rbac.md` |
| 3 | LLM 网关与密钥配额 | Key 走兼容入口；配额拦截；调用日志；真实成本字段 | complete | `.claude/plans/03-gateway-quota.md` |
| 3b | 审计 / Job / 配额预警 | 统一 audit 事件；共享 worker；配额阈值告警 + webhook | pending | `.claude/plans/03b-audit-jobs-alerts.md` |
| 4 | 项目知识库 RAG | 上传/向量化/检索；项目隔离；本地对象存储 | pending | `.claude/plans/04-project-knowledge.md` |
| 5 | MCP 资产治理 | 私有注册 + 公共市场启用；授权/计量/健康；调用入审计 | pending | `.claude/plans/05-mcp-assets.md` |
| 6 | 项目 Agent 与 AiGate Bot | Agent 绑 KB+MCP；Bot 查权限内用量；Skill 扩展点预留 | pending | `.claude/plans/06-agents.md` |
| 7a | 瘦控制台（Demo 0） | 登录、组织、密钥、配额、调用日志/导出、渠道凭证 | pending | `.claude/plans/07a-console-thin.md` |
| 7b | 管理控制台完整 MVP | 项目/KB/MCP/Agent/看板/成本导出 | pending | `.claude/plans/07-admin-console.md` |
| 8 | Skill 活资产（后置） | 记忆/版本/优化钩子/计费事件 | pending | `.claude/plans/08-skill-assets.md` |
| 9 | 部署与运维切片 | compose + migrate + readiness | pending | `.claude/plans/09-deploy-ops.md` |

### Demo 切片

| Demo | After | 用户可见结果 |
|---|---|---|
| Demo 0 | 03 + 03b + 07a | IT 发 Key、设配额、超限拦截、看日志/告警 |
| Demo 1 | 04 | 项目上传文档并可检索 |
| Demo 2 | 04 + 05 + 06 | MCP 授权 + Agent 引用回答（含 RAG） |
| Demo 3 | 07b + 09 | 完整控制台 + 可部署试点环境 |

## Decisions（原 Open Questions，已拍板）

- [x] **D1 网关**：旁路部署 NewAPI；AiGate 负责 Key/配额预检、审计写入、配置下发。不选 sub2api。
- [x] **D2 向量库**：MVP 用 **pgvector**（与业务库同 Postgres）。
- [x] **D3 组织层级**：MVP **三级**（租户 → 部门 → 员工）；Project 为资产容器，不做第四组织级。
- [x] **D4 前后端分离**：同仓两目录——**`backend/`**（Go：`cmd/` + `internal/` + `migrations/`）只提供 REST/SSE API；**`frontend/`**（Vue3 SPA）独立 `package.json` 构建部署，仅通过 HTTP 调用后端。禁止 Go template 主控制台、禁止 Nuxt/SSR 全栈回潮。CORS 与 API 契约由后端暴露、前端消费。
- [x] **D5 Job**：MVP **DB-backed jobs** + `cmd/worker`；不做 Redis 队列强依赖。
- [x] **D6 对象存储**：MVP **本地目录可配**；MinIO 后置。

## Engineering conventions

- **Schema comments**：`backend/migrations/` 中每张业务表、每个业务字段必须有详细的 `COMMENT ON TABLE` / `COMMENT ON COLUMN`（可用中文）；表达业务意图的索引也应注释。禁止提交无注释 DDL。
- **Repo layout**：`backend/` = Go API；`frontend/` = Vue SPA；不要把前端塞进 `backend/`，也不要把 Go 模块放回仓库根。

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 全量 Go 重写周期过长 | High | High | Demo 0–3 切片；先 07a 再 07b |
| NewAPI / Snail / 若依概念冲突 | Medium | High | 统一「项目=资产容器」；只借能力不借整仓 |
| 清场后需求漂移 | Medium | Medium | 以本 PRD 为基线；变更更新 Decisions |
| Skill 过早投入 | Medium | Medium | 08 后置；06 仅预留扩展点 |

---
*Status: READY — Milestones 1–3 complete; continue with Plan 03b `/goal`.*
*Legacy snapshot tag: `legacy-nuxt-aigate`.*
