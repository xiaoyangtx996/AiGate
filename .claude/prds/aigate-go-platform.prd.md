# AiGate Go Platform（All-in Go 重建）

## Problem

集团 IT 管理员与项目负责人同时需要把企业 AI 用得「可管、可控、可追溯」，并让每个项目拥有专属 AI 能力。现有 Nuxt 单体在网关精细化计量、多租户组织配额、项目级资产（知识库 / MCP / Skill / Agent）上能力碎片化，且与目标架构（Go 统一技术栈）不一致；继续在旧栈上叠加会放大技术债。若不重建，企业仍会面临费用失控、密钥外泄、工具滥用、知识外流与项目级智能能力缺失。

## Evidence

- 既有内部 PRD/MRD（`legacy-nuxt-aigate` 标签可回看 `docs/v2.0`）已定义四层能力：统一网关、管控、资产、智能。
- 产品决策确认：方案 C（All-in Go）；不以 sub2api 为唯一基座；网关参考 NewAPI 系；Agent/RAG 参考 Snail AI 能力边界；多租户参考若依式组织/RBAC 模型并用 Go 实现。
- Assumption — needs validation via 首批内部试点（集团 IT + 1～2 个真实项目负责人）访谈与用量数据。

## Users

- **Primary**：
  - 集团 / 分公司 IT 管理员 — 统一配额、密钥、审计、MCP 资产目录与全局策略。
  - 项目负责人 — 为项目创建知识库、Agent，授权 MCP/Skill，控制成员访问。
- **Secondary**：普通员工（专属密钥 + 使用项目 Agent）、财务/审计（费用分摊与日志）。
- **Not for**：个人开发者中转站 / 订阅拼车场景；私有模型微调与通用 AI 工作流编排平台。

## Hypothesis

We believe **用 Go 重建 AiGate（网关外挂成熟开源 + 自研多租户与项目资产操作系统）** will **同时满足企业级 Token/资产管控与项目级 Agent/RAG/MCP/Skill 能力** for **集团 IT 与项目负责人**.
We'll know we're right when **内部试点中：四级配额可守恒分配且可拦截超限调用；至少一个项目 Agent 可基于项目知识库回答并引用文档；MCP 调用可鉴权、计量并进入审计；核心路径日调用可稳定跑通**。

## Success Metrics

| Metric | Target | How measured |
|---|---|---|
| 网关核心链路可用 | OpenAI 兼容转发 + Key 鉴权 + 配额拦截 P0 通过 | 集成测试 + 手工冒烟 |
| 多租户隔离 | 跨租户无法读写对方项目/KB/密钥 | 权限测试用例 |
| 项目 Agent RAG | ≥1 项目可上传文档并引用回答 | 验收脚本 / Demo |
| MCP 资产调用 | 未授权不可调；授权可调且计入用量 | API 测试 |
| 内部验证用量 | 试点团队日均调用 > 50 次 | 平台用量看板 |

## Scope

**MVP** — Go 单体/模块化仓库落地：租户与组织 RBAC、员工 API Key、统一网关（对接或内嵌 NewAPI 能力）、项目域、项目知识库 RAG、MCP 注册/授权/计量、项目 Agent + 管理 Bot 最小对话、基础审计与配额预警。管理端可用最小 Vue 控制台或先 API+简单前端。

**Out of scope**
- 以 sub2api 为产品基座或订阅拼车能力 — 产品 DNA 冲突
- 完整 Skill 自优化与 Skill 收费市场 — 放在后期里程碑
- 部门级 Agent、跨知识库联合搜索、SSO（企微/钉钉/LDAP）— Could
- 模型微调 / AI 工作流编排 — Won't（与定位不符）
- 将旧 Nuxt 代码迁移式重写 — 已快照于 `legacy-nuxt-aigate`，本产品线为 greenfield

## Delivery Milestones

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Go 仓库骨架与领域边界 | 可编译的 Go workspace，租户/组织/项目领域模型与迁移可跑 | pending | `.claude/plans/01-go-scaffold.md` |
| 2 | 多租户 RBAC 与身份 | 管理员可管理用户/角色/组织树；请求带租户上下文 | pending | `.claude/plans/02-tenant-rbac.md` |
| 3 | LLM 网关与密钥配额 | 员工 Key 调用 OpenAI 兼容入口；配额不足被拦截；调用有日志 | pending | `.claude/plans/03-gateway-quota.md` |
| 4 | 项目知识库 RAG | 项目可上传文档、向量化、检索；权限按项目隔离 | pending | `.claude/plans/04-project-knowledge.md` |
| 5 | MCP 资产治理 | MCP 可注册/授权；调用经鉴权计量；健康检查可告警 | pending | `.claude/plans/05-mcp-assets.md` |
| 6 | 项目 Agent 与 AiGate Bot | 项目 Agent 绑 KB+MCP 可对话；管理 Bot 可查权限内用量 | pending | `.claude/plans/06-agents.md` |
| 7 | 管理控制台 MVP | 关键管理页可用：组织、密钥、项目、KB、MCP、Agent | pending | `.claude/plans/07-admin-console.md` |
| 8 | Skill 活资产（后置） | Skill 可沉淀调用记忆并支持版本；预留计费事件 | pending | `.claude/plans/08-skill-assets.md` |

## Open Questions

- [ ] 网关是「进程内自研薄网关 + 协议库」还是「旁路部署 NewAPI 并由 AiGate 管控面下发配置」？
- [ ] 向量库首发用 pgvector 还是 Milvus？（影响部署复杂度）
- [ ] 管理端是否必须 Vue3 独立仓，还是先 Go template + 极简前端？
- [ ] 首批试点组织层级是否必须四级齐全，还是允许「租户→部门→员工」三级 MVP？

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 全量 Go 重写周期过长，长期无可用产品 | High | High | 严格按里程碑可演示切片交付；网关外挂成熟开源 |
| 三源设计（NewAPI / Snail / 若依）模型冲突 | Medium | High | 统一「项目=资产容器」领域模型，只借能力不借整仓 |
| 清场后需求漂移 | Medium | Medium | 以本 PRD 为唯一需求基线；变更走 Open Questions |
| Skill 自优化过早投入 | Medium | Medium | 明确放在里程碑 8，MVP 不做 |

---
*Status: DRAFT — requirements only. Implementation planning pending via plans + `/goal`.*
*Legacy snapshot tag: `legacy-nuxt-aigate` (commit recoverable anytime).*
