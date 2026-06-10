# 阶段 3：MCP 市场 设计 spec

> 日期：2026-06-10
> 总纲：`2026-06-10-aigate-v2-roadmap-overview.md`
> 参考：aitmpl.com/mcps（卡片市场/详情页/Stack 批量安装/env 占位符）、snail-ai sai_mcp_server（传输层字段）
> 前置依赖：阶段 0+1 完成；与阶段 2 无强依赖，可并行

---

## 范围

**范围内**：市场卡片页重构、市场详情二级页、安装流程（env 占位符表单）、私有工具详情页、传输层/认证字段扩展、批量安装（Stack 式下发）、连接测试。
**范围外**：社区/公共市场远程同步、安全评分自动化（字段预留）、按成员粒度的授权矩阵（消费侧授权由阶段 4 的 Agent 绑定承担）、Stdio 工具的服务端执行。

## 数据模型

### mcp_tool 表（扩展，抄 snail-ai sai_mcp_server）

| 新增字段                               | 说明                                                             |
| -------------------------------------- | ---------------------------------------------------------------- |
| `transportType`                        | `stdio / sse / streamable_http`                                  |
| `command` / `args`(json) / `env`(json) | stdio 配置；env 值脱敏展示                                       |
| `serverUrl`                            | sse / streamable_http 的服务地址                                 |
| `authType`                             | `none / api_key / bearer / basic`                                |
| `authConfig`(json)                     | 凭证（脱敏）                                                     |
| `connectionStatus`                     | `unknown / connected / failed`                                   |
| `lastConnectedAt` / `lastError`        | 测试结果                                                         |
| `category` / `icon`                    | 分类徽章与图标                                                   |
| `sourceSlug`                           | 来自市场预设的 slug；手工注册为 null                             |
| `securityScore`(json, nullable)        | 预留：`{ validated, score, errorCount }`（aitmpl security 字段） |

### 市场预设（服务端常量，扩展现有 `mcp-tool/marketplace.get.ts`）

每条预设：`slug / name / category / icon / description / usage(markdown) / mcpServers 配置 JSON / envSchema`。

**env 占位符约定**：配置 JSON 中 env 值写 `<your-github-token>` 形式；`envSchema` 由占位符自动推导（变量名、描述、是否必填），安装时渲染为表单。

分类首批：开发工具 / 数据库 / 浏览器自动化 / 办公协作 / 数据集成（对齐 aitmpl 分类分布）。

安装量 = 按 `sourceSlug` 统计 mcp_tool 行数（跨组织汇总，管理员可见明细）。

## API

| 端点                                       | 说明                                                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET mcp-tool/marketplace`                 | 现有，扩展返回 slug/category/usage/envSchema/已安装标记（当前组织）                                                                                                                |
| `GET mcp-tool/marketplace/[slug]`          | 单条预设详情                                                                                                                                                                       |
| `POST mcp-tool/marketplace/[slug]/install` | body 为 env 表单值 → 校验 envSchema → 创建 mcp_tool（绑定当前 activeOrganizationId，回填 sourceSlug）                                                                              |
| `POST mcp-tool/marketplace/batch-install`  | body 为 `[{ slug, env }]` 数组，事务内逐个安装（Stack 下发）                                                                                                                       |
| `POST mcp-tool/[id]/test`                  | 连接测试：sse/streamable_http 实际建连并执行 `tools/list`，返回工具清单与延迟，更新 connectionStatus；**stdio 不在服务端执行**（任意命令执行有安全风险），返回「仅客户端可测」标记 |
| `mcp-tool` CRUD                            | 现有，表单扩展传输层字段                                                                                                                                                           |
| `mcp-tool/[id]/versions`                   | 基于现有 `mcp_tool_version` 表的列表 + 新增（阶段 0+1 已修联查）                                                                                                                   |

可见性规则沿用 principal 过滤：工具属于其 organizationId；admin 创建时可置 organizationId 为空 = 全局工具，所有组织可见可用。

## 前端页面

1. **市场页重构**（`mcp-tools/marketplace/index.vue`）：左侧分类筛选 + 顶部搜索；卡片四要素 = 图标+名称 / 分类徽章 / 一句话描述 / 安装量，已安装显示徽章；卡片底部 [详情] [安装] [加入待装]（购物车式多选）。
2. **市场详情二级页**（新增 `mcp-tools/marketplace/[slug].vue`）：
   - Tab「概览」：描述 + usage markdown（@nuxtjs/mdc 渲染）
   - Tab「配置」：mcpServers JSON 高亮展示 + 一键复制
   - Tab「安装」：envSchema 自动表单（占位符 → 输入框，必填校验）→ [安装到当前组织]
3. **批量安装 Drawer**：待装清单（可移除）→ 逐工具 env 表单分组 → [全部安装]，结果逐条反馈成功/失败。
4. **私有工具详情页**（新增 `mcp-tools/[id].vue`）：Tab = 概览（基础信息 + connectionStatus 状态灯 + lastError）/ 配置（传输层与认证字段编辑 + [连接测试]）/ 版本（mcp_tool_version 列表 + 新增版本）。
5. **注册向导改造**（`mcp-tools/index.vue` 弹窗 → Drawer 三步）：基础信息 → 服务配置（transportType 切换不同字段组）→ 连接测试（stdio 跳过）。
6. 菜单：marketplace 详情页无需菜单项（面包屑回跳）；其余沿用阶段 0+1 已补的菜单。

## 验收标准

1. 市场页按分类筛选、搜索可用；卡片点击进详情二级页，面包屑可回跳。
2. 安装一个含 2 个 env 占位符的预设：表单自动生成、必填校验生效、安装后出现在「MCP 工具」列表且归属当前组织。
3. 多选 3 个预设批量安装，其中 1 个故意缺必填 env → 该条失败、其余成功，反馈逐条清晰。
4. sse 类型工具连接测试返回工具清单；stdio 类型显示「仅客户端可测」。
5. 切换组织（阶段 1 切换器）后，「已安装」徽章与工具列表随组织变化。

## 风险

| 风险                      | 缓解                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| 服务端对外建连（SSRF 面） | 测试端点校验 serverUrl 协议仅 http/https、禁内网保留段（可配置白名单放行内部部署），超时 10s |
| stdio 工具无法服务端验证  | 明确标记「仅客户端可测」，不假装健康                                                         |
| 预设维护成本              | 预设为代码内常量，随版本发布更新；不做运行时远程拉取                                         |
