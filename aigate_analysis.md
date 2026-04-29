# AiGate v2.0 — 开源项目分析与架构方案

## 1. 三个开源项目定位速览

| 项目 | 技术栈 | 核心定位 | 与 AiGate 的关系 |
|------|--------|----------|-----------------|
| **CLIProxyAPI** | Go (net/http) | CLI 工具的 AI API 代理，支持 OAuth 多账号负载均衡 | 网关转发核心可直接参考 |
| **new-api** | Go + Gin + React | 大模型网关 + 资产管理系统（One API 二开）| 网关 + 管理后台 + 计费体系可深度参考 |
| **ruoyi-ai** | Java Spring Boot + Langchain4j + Vue | 企业级 AI 助手平台（RAG + Agent + MCP + 工作流）| RAG/Agent/MCP 业务逻辑可参考 |

---

## 2. PRD 功能模块 × 开源项目映射

下表逐一对应 PRD v2.0 的 7 个核心模块，标注每个开源项目中**可复用的逻辑**及**需要新建的部分**。

### 2.1 统一 AI 网关（Go + Gin）

| PRD 需求 | CLIProxyAPI 可参考 | new-api 可参考 | ruoyi-ai | 复用建议 |
|---------|-------------------|---------------|----------|---------|
| OpenAI 兼容接口标准 | `internal/translator/` 多协议翻译器（OpenAI/Claude/Gemini/Codex 格式互转） | `relay/` 中继层完整实现 chat/embedding/audio/image/rerank 等路由 | 无（Java 实现） | **主参考 new-api 的 relay 层**，它用 Gin 框架、路由结构清晰，与目标技术栈完全一致 |
| 身份验证（ag-xxx Key） | `api-keys` 静态配置校验 | `middleware/auth.go` 完整的 Token 校验流程（解析 Bearer/x-api-key，查库验证，IP 白名单） | 无 | **直接参考 new-api 的 TokenAuth 中间件**，改造 Key 格式为 `ag-{env}-{hex}` |
| 配额检查 | 无 | `middleware/distributor.go` 分发前额度校验 + `model/token.go` Token 余额管理 | 无 | **参考 new-api 的配额校验链路**，扩展为四级配额层次 |
| IP 白名单安全校验 | 无 | `middleware/auth.go:351-364` IP CIDR 列表校验 | 无 | **直接复用** new-api 的 `IsIpInCIDRList` 逻辑 |
| 请求转发 + 响应回传 | `internal/api/server.go` 高性能 HTTP 反向代理 + SSE 流式转发 | `relay/relay_task.go` 完整的请求转发、流式处理逻辑 | 无 | **主参考 new-api 的 relay_task**，CLIProxyAPI 的流式处理可作为性能优化参考 |
| 异步用量记录 | `internal/usage/` 用量统计 | `model/log.go` 调用日志记录（Token 数、模型、时间、IP） | 无 | **参考 new-api 的 Log 模型**，异步写入改用 Redis Streams |
| P99 < 50ms | CLIProxyAPI 的 `commercial-mode` 低开销模式 | 无特殊优化 | 无 | 网关层纯 Go 实现，参考 CLIProxyAPI 的内存优化策略 |
| 多模型格式互转 | `internal/translator/` 支持 OpenAI⇄Claude⇄Gemini⇄Codex | `relay/` 中的 claude_handler/gemini_handler/compatible_handler | 无 | **CLIProxyAPI 的 translator 设计更精炼**，可直接移植适配器模式 |

> [!TIP]
> 网关层的核心路由结构建议直接参考 new-api 的 `relay-router.go`，它已经覆盖了 `/v1/chat/completions`、`/v1/messages`、`/v1/embeddings`、`/v1beta/models` 等所有主流路径。协议翻译器参考 CLIProxyAPI 的 translator 架构。

### 2.2 组织与配额管理（Python + FastAPI）

| PRD 需求 | CLIProxyAPI | new-api 可参考 | ruoyi-ai 可参考 | 复用建议 |
|---------|-------------|---------------|----------------|---------|
| 四级组织结构 | 无 | `model/user.go` 用户/角色模型（Root/Admin/Common 三级） | `ruoyi-system` 部门/角色/用户管理（树形组织结构） | **参考 ruoyi-ai 的组织树模型设计**，扩展为集团→分公司→部门→员工四级 |
| Token 配额 + 费用配额 | 无 | `model/token.go` Token 余额管理 + `model/pricing.go` 计价模型 | 无 | **参考 new-api 的配额管理思路**，扩展为双维度 |
| 配额守恒分配 | 无 | 无 | 无 | **需新建**：父子节点配额约束逻辑 |
| 超额申请审批 | 无 | 无 | `ruoyi-workflow` 工作流引擎 | **参考 ruoyi-ai 的工作流模块**，但 AiGate 只需轻量审批流 |
| 月度/季度配额周期重置 | 无 | 无 | 无 | **需新建** |

### 2.3 密钥管理（Python + FastAPI）

| PRD 需求 | CLIProxyAPI | new-api 可参考 | ruoyi-ai | 复用建议 |
|---------|-------------|---------------|----------|---------|
| 密钥生成 ag-{env}-{hex} | `api-keys` 静态列表 | `model/token.go` 动态 Token 生成（自动生成随机 Key，支持过期时间、模型限制、IP 限制） | 无 | **直接参考 new-api 的 Token 模型**，修改前缀格式 |
| 密钥上限 3 个/人 | 无 | `controller/token.go` Token CRUD + 数量控制 | 无 | **参考 new-api 的 Token 控制器** |
| 密钥到期预警 | 无 | 无 | 无 | **需新建** |
| 离职吊销 | 无 | `model/token.go` 禁用/删除 Token | 无 | **参考 Token 状态管理** |

### 2.4 MCP 资产市场（Python + FastAPI）

| PRD 需求 | CLIProxyAPI | new-api | ruoyi-ai 可参考 | 复用建议 |
|---------|-------------|---------|----------------|---------|
| MCP 工具注册 | 无 | 无 | `service/mcp/` MCP 服务管理 + `config/mcp/` MCP 配置 + `domain/entity/mcp/` MCP 实体模型 | **参考 ruoyi-ai 的 MCP 模块设计**（实体、服务、配置结构） |
| 公共市场 + 私有工具库 | 无 | 无 | `controller/mcp/` MCP 控制器 | **参考其分类管理逻辑**，但需新建市场化 UI |
| MCP 权限矩阵 | 无 | 无 | 有基础权限控制 | **参考其权限模型**，扩展为项目/部门级 |
| MCP 代理转发 | 无 | 无 | `mcp/service/core/` MCP 核心服务 | **参考其 MCP 代理转发设计**，集成到 AiGate 网关 |

### 2.5 企业知识库 RAG（Python + LangChain）

| PRD 需求 | CLIProxyAPI | new-api | ruoyi-ai 可参考 | 复用建议 |
|---------|-------------|---------|----------------|---------|
| 文档解析 | 无 | 无 | `service/knowledge/impl/loader/` 文档加载器 | **参考其文档加载器架构**，用 Python 实现（PyMuPDF/python-docx） |
| 分块策略 | 无 | 无 | `service/knowledge/impl/split/` 分块实现 | **参考分块策略设计**，用 LangChain TextSplitter 重写 |
| 向量化存储 | 无 | 无 | `service/vector/impl/` 向量存储（支持 Milvus/Qdrant/Weaviate） | **参考多向量库适配模式**，AiGate 默认 Qdrant |
| 混合检索 + Rerank | 无 | `relay/rerank_handler.go` Rerank 转发 | `service/retrieval/` 检索服务 + `service/rerank/` Rerank 服务 | **参考 ruoyi-ai 的检索+Rerank 架构**，用 LangChain 实现 |
| Embedding 模型 | 无 | `relay/embedding_handler.go` Embedding 转发 | `service/embed/` Embedding 服务 | **Embedding 调用走 AiGate 网关自身转发**，参考 new-api 的 embedding_handler |

> [!IMPORTANT]
> ruoyi-ai 的 RAG 全链路（loader → split → embed → vector → retrieval → rerank）虽然是 Java 实现，但**架构分层和接口设计可以直接映射到 Python LangChain 的组件体系**。建议逐层对照其实现来设计 Python 版本。

### 2.6 Agent 体系（Python + LangGraph）

| PRD 需求 | CLIProxyAPI | new-api | ruoyi-ai 可参考 | 复用建议 |
|---------|-------------|---------|----------------|---------|
| AiGate Bot（管理 Agent） | 无 | 无 | `agent/` Agent 框架（config/domain/manager/tool 四层结构） | **参考其 Agent 分层设计**，用 LangGraph 重写 |
| 项目级 Agent | 无 | 无 | Agent 创建 + 权限绑定 | **参考实体模型和管理逻辑** |
| Agent 工具调用 | 无 | 无 | `agent/tool/` 工具定义 + `mcp/tools/` MCP 工具集成 | **参考其工具注册和调用模式**，适配 LangGraph Tool 接口 |
| 对话记忆 | 无 | 无 | `service/chat/impl/memory/` 对话记忆管理 | **参考记忆管理策略**，用 LangGraph Checkpointer 实现 |

### 2.7 预警与通知

| PRD 需求 | 所有项目 | 复用建议 |
|---------|---------|---------|
| 配额预警（70%/90%/100%） | 无直接实现 | **需新建**，基于 Redis 实时计数触发 |
| 密钥到期预警 | 无 | **需新建** |
| MCP/Agent 异常预警 | 无 | **需新建** |
| 预警中心页面 | 无 | **需新建** |

---

## 3. 复用总结矩阵

```
AiGate 模块          主参考项目         参考深度    需新建比例
─────────────────────────────────────────────────────────
AI 网关              new-api + CPA      深度复用    ~20%
组织管理             ruoyi-ai           架构参考    ~60%
密钥管理             new-api            深度复用    ~30%
MCP 资产市场         ruoyi-ai           架构参考    ~50%
知识库 RAG           ruoyi-ai           架构参考    ~40%（换 Python 实现）
Agent 体系           ruoyi-ai           架构参考    ~50%（换 LangGraph 实现）
预警通知             无                 全新开发    ~90%
前端管理后台         new-api            UI参考      ~60%（换 React 实现）

CPA = CLIProxyAPI
```

---

## 4. 建议的项目目录结构

基于 PRD 技术架构要求，建议如下目录布局：

```
aigate/
├── gateway/                    # AI 网关（Go + Gin）
│   ├── cmd/                    #   启动入口
│   ├── internal/
│   │   ├── config/             #   配置加载
│   │   ├── middleware/         #   鉴权/配额/限流/日志中间件
│   │   ├── relay/              #   请求转发核心（参考 new-api relay/）
│   │   ├── translator/         #   协议翻译（参考 CLIProxyAPI translator/）
│   │   ├── model/              #   数据模型（Token/Channel/Log）
│   │   └── cache/              #   Redis 缓存层
│   ├── go.mod
│   └── Dockerfile
│
├── api/                        # 管理 API（Python + FastAPI）
│   ├── app/
│   │   ├── core/               #   配置、安全、依赖注入
│   │   ├── models/             #   SQLAlchemy 模型
│   │   ├── schemas/            #   Pydantic Schema
│   │   ├── api/                #   路由层
│   │   │   ├── v1/
│   │   │   │   ├── org.py      #     组织管理
│   │   │   │   ├── quota.py    #     配额管理
│   │   │   │   ├── key.py      #     密钥管理
│   │   │   │   ├── mcp.py      #     MCP 资产
│   │   │   │   ├── alert.py    #     预警
│   │   │   │   └── report.py   #     报表
│   │   │   └── deps.py
│   │   ├── services/           #   业务逻辑层
│   │   └── tasks/              #   异步任务（Redis Streams）
│   ├── requirements.txt
│   └── Dockerfile
│
├── rag/                        # RAG 服务（Python + LangChain）
│   ├── app/
│   │   ├── loaders/            #   文档解析器
│   │   ├── splitters/          #   分块策略
│   │   ├── embeddings/         #   向量化
│   │   ├── vectorstores/       #   Qdrant 适配
│   │   ├── retrievers/         #   混合检索 + Rerank
│   │   └── api.py              #   FastAPI 接口
│   ├── requirements.txt
│   └── Dockerfile
│
├── agent/                      # Agent 引擎（Python + LangGraph）
│   ├── app/
│   │   ├── graphs/             #   LangGraph 图定义
│   │   ├── tools/              #   工具注册（MCP 代理、数据库查询等）
│   │   ├── memory/             #   对话记忆
│   │   └── api.py              #   FastAPI 接口
│   ├── requirements.txt
│   └── Dockerfile
│
├── web/                        # 前端（React + TypeScript + Tailwind）
│   ├── src/
│   │   ├── pages/
│   │   │   ├── dashboard/      #   运营看板
│   │   │   ├── org/            #   组织管理
│   │   │   ├── keys/           #   密钥管理
│   │   │   ├── mcp/            #   MCP 市场
│   │   │   ├── knowledge/      #   知识库
│   │   │   ├── agent/          #   Agent 管理
│   │   │   └── alerts/         #   预警中心
│   │   ├── components/
│   │   └── ...
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml          # MVP 编排
├── docker-compose.prod.yml     # 生产编排
└── docs/
```

---

## 5. 关键技术决策建议

### 5.1 网关与管理 API 的通信

网关（Go）与管理 API（Python）之间需要高频交互（鉴权查询、配额校验）。建议：

- **热数据缓存在 Redis**：Token 信息、配额余额、组织层级关系全部缓存到 Redis
- **网关直接读 Redis，不走 API 调用**：避免跨服务 HTTP 延迟
- **管理 API 写入 PostgreSQL 后同步更新 Redis**
- 这样可以保证网关层 P99 < 50ms 的目标

### 5.2 来自 new-api 的核心参考模式

new-api 的以下设计模式可以直接移植到 AiGate 网关：

1. **TokenAuth 中间件链**：Bearer 解析 → Key 查找 → 用户校验 → IP 白名单 → 配额检查 → 上下文注入
2. **Distribute 中间件**：根据模型匹配可用渠道，加权随机选择，失败自动重试
3. **Relay 转发模式**：根据 `RelayFormat` 枚举分发到不同 handler
4. **日志模型**：调用记录的字段设计（token_id, model, prompt_tokens, completion_tokens, channel_id, ip, created_at）

### 5.3 来自 CLIProxyAPI 的核心参考模式

1. **Translator 适配器模式**：每种 AI 服务商一个 translator 包（openai/claude/gemini/codex），实现统一接口
2. **OAuth 多账号负载均衡**：深度整合 CPA 的 OAuth 认证流程（`internal/auth/claude/anthropic_auth.go` 等）与路由策略（`internal/access/reconcile.go`），实现基于配置的动态 provider 发现、Token 自动刷新与多账号池的高效调度（Round-Robin/Session Affinity）。
3. **Commercial Mode**：高并发下关闭高开销中间件的开关设计

### 5.5 多租户架构（基于若依框架思想）

采用 **字段级隔离（共享数据库，独立 Schema/Tenant_ID 字段）**，参考 `ruoyi-common-tenant` 的实现方案：
1. **统一拦截**：使用 MyBatis-Plus (或 SQLAlchemy 对应的拦截器) 在底层自动拼接 `tenant_id = ?` 条件（参考 `PlusTenantLineHandler`）。
2. **上下文传递**：通过 `TenantHelper` 在 ThreadLocal 或上下文中传递当前租户信息。
3. **数据初始化**：新建租户时，同步初始化租户的默认角色、字典配置和菜单权限（参考 `SysTenantServiceImpl.insertByBo`）。
4. **配额隔离**：各租户的 Token 消耗、密钥、API Channel 完全隔离。

### 5.6 前端 UI 设计规范

为保证产品级体验，严格遵守以下规范：
1. **TailwindCSS 版本**：指定使用 **v4**。
2. **色彩规范**：**绝对禁止使用蓝紫渐变色**。建议采用深邃克制的科技黑/灰为主色调，搭配高对比度的强调色（如品牌绿或橙），呈现高级感。
3. **图标规范**：**全站禁止使用 Emoji**，必须统一使用高质量的 SVG 图标（如 Lucide 或 Heroicons）。
4. **布局与质感**：顶部采用全局导航栏，并必须实现**磨玻璃（Glassmorphism）半透明效果**（`backdrop-blur`），提供现代且通透的视觉体验。

### 5.4 来自 ruoyi-ai 的核心参考模式

1. **RAG 全链路分层**：`loader → split → embed → vector → retrieval → rerank`，每层独立可替换
2. **Agent 四层架构**：`config → domain → manager → tool`，Agent 创建、管理、执行分离
3. **MCP 集成模式**：`mcp/service/core` 核心代理 + `mcp/tools` 工具适配
4. **对话记忆管理**：`memory/` 独立模块，支持多种记忆策略

---

## 6. MVP 分期建议（本地运行优先）

> [!IMPORTANT]
> 部署优先级和 SSO 集成暂时不考虑，MVP 阶段核心目标是**本地实现功能并跑通核心链路**。

### Phase 1：网关核心与多租户底座（2-3 周）
- FastAPI 管理后台（包含多租户体系、组织/配额/密钥 CRUD）
- PostgreSQL 共享库多租户模型
- Go 网关搭建（集成 CPA 的 OAuth 多账号负载均衡与请求转发）
- OpenAI 兼容接口转发（基于 new-api distributor）

### Phase 2：RAG 与前端骨架（2 周）
- React + Tailwind v4 前端后台搭建（顶部磨玻璃导航栏、无 Emoji、严格遵循色彩规范）
- LangChain 文档处理管线与本地 Qdrant 向量检索
- 知识库管理 API

### Phase 3：MCP 与 Agent（2 周）
- 依据最终需求，直接使用 Python 落地 MCP 协议核心（参考 ruoyi-ai `mcp/service/core` 设计思想，但用 Python/LangChain 实现）
- LangGraph Agent 引擎集成 MCP 工具调用
- 本地跑通完整的 RAG + Agent 链路

---

## 7. 已确认的需求基线（2026-04-29 更新）

1. **前端技术**：确定使用 **Tailwind v4**。UI 设计避免蓝紫渐变，拒用 Emoji（改用 SVG），顶部需带有磨玻璃效果的导航栏。
2. **多租户策略**：参考若依（ruoyi）的多租户实现，通过字段（Tenant_ID）进行数据隔离，在 DAO 层/ORM 层进行统一拦截拦截。
3. **MCP 协议版本**：不局限于现有开源项目，**直接根据最终需求用 Python 进行落地**。
4. **部署与 SSO**：暂时**不考虑**高可用部署（K8s等）和 SSO（企业微信/钉钉/LDAP等）集成，MVP 阶段**优先保证本地功能跑通**。
5. **网关核心能力**：必须兼容实现 CLIProxyAPI (CPA) 的 **支持 OAuth 多账号负载均衡** 特性。
