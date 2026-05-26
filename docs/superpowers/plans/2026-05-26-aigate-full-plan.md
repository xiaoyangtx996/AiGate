# AiGate v2.0 完整实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AiGate 从基础脚手架升级为企业级 AI 全栈管控平台，对标 snail-ai/new-api 等成熟项目

**Architecture:** Nuxt 4 (SSR) + Nuxt UI v4 + Better Auth + Drizzle ORM + PostgreSQL，前端已在 better-nuxt 底座上完成认证、菜单、角色、国际化等基础设施，后续聚焦 AiGate 业务功能完善

**Tech Stack:** Nuxt 4, Nuxt UI v4, TypeScript, Drizzle ORM, PostgreSQL, Better Auth, Pinia, VueUse, motion-v, nuxt-charts

---

## 项目现状分析

### 已完成（可直接使用）
- ✅ 认证系统（邮箱注册/登录、Magic Link、OAuth、多会话、管理员封禁）
- ✅ 菜单管理（树形结构、CRUD、权限位、i18n key）
- ✅ 角色管理（CRUD、权限矩阵、角色授权）
- ✅ 用户管理（列表、封禁、重置密码、会话查看）
- ✅ 国际化（中/英、数据库驱动、树形管理）
- ✅ 操作日志（自动记录、筛选、删除）
- ✅ 主题系统（18 色主色、暗亮模式、圆角、路由动画）
- ✅ 多标签页、侧边栏折叠、全局搜索、返回顶部
- ✅ 数据库 Schema（organization, channel, api_key, ai_model, mcp_tool, agent, knowledge_base, prompt, alert, api_log, billing_record）

### 需要完善（有页面但功能简陋）
- ⚠️ Dashboard - 只有 4 个统计卡片 + 组织配额列表，缺真实图表
- ⚠️ 渠道管理 - 基础 CRUD 表单，缺连通性测试、多账号池
- ⚠️ API 密钥 - 基础 CRUD，缺详情抽屉、IP 白名单、生命周期时间线
- ⚠️ 模型列表 - 只读展示，缺筛选、对比、价格计算
- ⚠️ MCP 工具 - 基础卡片列表，缺配置向导、健康监控、详情页
- ⚠️ Agent - 卡片列表，缺创建向导、对话窗口、工具/知识库绑定
- ⚠️ 知识库 - 卡片列表，缺文档上传、向量化进度、详情页、检索测试
- ⚠️ 提示词 - 卡片列表，缺编辑器、变量预览、沙箱调试
- ⚠️ 告警中心 - 简单列表，缺分类 Tab、处置抽屉、自动刷新
- ⚠️ API 日志 - 基础表格，缺多维筛选、详情抽屉、导出
- ⚠️ 账单 - 基础表格，缺图表、月报导出
- ⚠️ 组织配额 - 基础卡片，缺配额调整、审批流

### 缺失功能（无页面）
- ❌ 系统设置聚合页（11 个 Tab：基础信息、预警规则、通知渠道、密钥默认等）
- ❌ 我的工作台（员工端首页）
- ❌ 配额申请审批
- ❌ 操作审计（区别于操作日志，365 天留存）
- ❌ 开发者中心（接入指南、SDK、API 文档）
- ❌ 系统状态页（各组件健康状态）
- ❌ 首次入驻向导
- ❌ 订阅与计费
- ❌ AiGate Bot 对话面板（管理 Agent）
- ❌ 错误页面（404/403/500）

---

## 阶段 A：MVP UI 闭环（目标：所有页面可交互）

### Task 1: Dashboard 数据大盘增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/dashboard/index.vue`

- [ ] **Step 1: 添加 Token 消耗趋势折线图**

在统计卡片下方添加 `nuxt-charts` 折线图，X 轴为最近 7 天，Y 轴为 Token 消耗量

- [ ] **Step 2: 添加 API 调用分布环形图**

展示各模型的调用占比（chat/embedding/image）

- [ ] **Step 3: 添加实时流量卡片**

显示当前 QPS、在线密钥数、活跃 Agent 数

- [ ] **Step 4: Commit**

### Task 2: 渠道管理增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/channels/index.vue`
- Modify: `AiGate-app/server/api/aigate/channel/`

- [ ] **Step 1: 添加连通性测试按钮**

点击"测试"按钮调用后端 API 验证渠道连通性，显示延迟结果

- [ ] **Step 2: 添加表单弹窗完整字段**

表单包含：名称、供应商标签、端点 URL、API Key、支持模型（多选）、优先级、权重、QPS、限流策略

- [ ] **Step 3: 添加详情抽屉**

点击渠道名称展开 Drawer，显示完整配置 + 最近调用统计 + 健康检查历史

- [ ] **Step 4: Commit**

### Task 3: API 密钥管理增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/api-keys/index.vue`

- [ ] **Step 1: 添加详情抽屉**

点击密钥名称展开 Drawer，显示：密钥值（可复制）、创建时间、最后使用、IP 白名单、调用统计

- [ ] **Step 2: 添加生命周期时间线**

在详情抽屉中用 Timeline 组件展示密钥状态变更历史

- [ ] **Step 3: 添加批量操作**

支持多选吊销、批量删除

- [ ] **Step 4: Commit**

### Task 4: 模型管理增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/models/index.vue`

- [ ] **Step 1: 添加供应商筛选和类型筛选**

顶部添加筛选栏：供应商下拉、类型下拉（chat/embedding/image）、状态筛选

- [ ] **Step 2: 添加价格计算器**

在模型卡片中添加"费用估算"输入框，输入 Token 数自动计算费用

- [ ] **Step 3: Commit**

### Task 5: MCP 工具增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/mcp-tools/index.vue`
- Modify: `AiGate-app/server/api/aigate/mcp-tool/`

- [ ] **Step 1: 添加配置弹窗**

点击"配置"打开 Modal，根据工具类型（github/notion/database/api/custom）显示不同表单字段

- [ ] **Step 2: 添加健康检查**

显示最后健康检查时间、健康状态标签，添加"重新检查"按钮

- [ ] **Step 3: Commit**

### Task 6: Agent 引擎增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/agents/index.vue`
- Create: `AiGate-app/app/pages/aigate/agents/[id].vue`
- Create: `AiGate-app/app/pages/aigate/agents/create.vue`

- [ ] **Step 1: 创建 Agent 编排页**

创建向导：基本信息 → 选择模型 → 配置系统提示词 → 绑定 MCP 工具 → 绑定知识库 → 预览 & 发布

- [ ] **Step 2: 创建 Agent 对话页**

右侧对话窗口 + 左侧配置面板，支持实时对话、工具调用步骤展示、引用溯源

- [ ] **Step 3: Commit**

### Task 7: 知识库增强（参考 snail-ai 设计）

**Files:**
- Modify: `AiGate-app/app/pages/aigate/knowledge-base/index.vue`
- Create: `AiGate-app/app/pages/aigate/knowledge-base/[id].vue`
- Modify: `AiGate-app/server/api/aigate/knowledge-base/`

- [ ] **Step 1: 重构列表页为项目维度**

改为表格 + 卡片双视图，支持搜索、状态筛选、类型筛选

- [ ] **Step 2: 创建详情页**

左侧文档列表（树形）+ 右侧预览区，支持文档上传（拖拽）、删除、向量化进度

- [ ] **Step 3: 添加检索测试**

详情页底部添加"检索测试"面板，输入问题返回 Top-K 相似片段

- [ ] **Step 4: Commit**

### Task 8: 提示词库增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/prompts/index.vue`
- Create: `AiGate-app/app/pages/aigate/prompts/[id].vue`

- [ ] **Step 1: 添加创建/编辑弹窗**

包含：名称、描述、内容（Monaco Editor 或 textarea）、分类选择、变量提取

- [ ] **Step 2: 添加变量预览**

自动识别 `{{variable}}` 格式，生成输入表单，实时预览渲染结果

- [ ] **Step 3: Commit**

### Task 9: 告警中心重构

**Files:**
- Modify: `AiGate-app/app/pages/aigate/alerts/index.vue`

- [ ] **Step 1: 添加分类 Tab**

按严重程度分 Tab：全部 / Critical / Warning / Info

- [ ] **Step 2: 添加处置抽屉**

点击告警展开 Drawer，显示完整详情 + 处置操作（标记已读、忽略、关联资源跳转）

- [ ] **Step 3: 添加自动刷新**

30 秒自动刷新 + 新告警 Toast 提醒

- [ ] **Step 4: Commit**

### Task 10: API 日志增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/api-logs/index.vue`

- [ ] **Step 1: 添加多维筛选栏**

时间范围、模型、状态码、组织、用户筛选

- [ ] **Step 2: 添加详情抽屉**

点击日志行展开 Drawer，显示完整请求/响应、Token 分布、费用明细

- [ ] **Step 3: 添加导出功能**

导出为 CSV

- [ ] **Step 4: Commit**

### Task 11: 账单管理增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/billing/index.vue`

- [ ] **Step 1: 添加费用趋势图**

月度费用折线图 + Token 用量柱状图

- [ ] **Step 2: 添加月报导出**

导出 PDF/CSV 月报

- [ ] **Step 3: Commit**

### Task 12: 组织配额增强

**Files:**
- Modify: `AiGate-app/app/pages/aigate/dashboard/organization.vue`
- Modify: `AiGate-app/server/api/aigate/organization/`

- [ ] **Step 1: 添加配额调整**

管理员可直接在卡片上调整配额值

- [ ] **Step 2: 添加子组织管理**

支持在组织卡片内添加/编辑子组织

- [ ] **Step 3: Commit**

### Task 13: 缺失页面 - 我的工作台

**Files:**
- Create: `AiGate-app/app/pages/hub/workspace/index.vue`

- [ ] **Step 1: 创建工作台页面**

展示：我的密钥列表、我的 Agent、最近调用、配额使用概览、快捷操作入口

- [ ] **Step 2: Commit**

### Task 14: 缺失页面 - 错误页面

**Files:**
- Create: `AiGate-app/app/pages/error/404.vue`
- Create: `AiGate-app/app/pages/error/403.vue`
- Create: `AiGate-app/app/pages/error/500.vue`

- [ ] **Step 1: 创建错误页面**

统一风格的错误页面，包含返回首页按钮、错误描述

- [ ] **Step 2: 配置 Nuxt 错误处理**

在 `nuxt.config.ts` 中配置错误页面路由

- [ ] **Step 3: Commit**

---

## 阶段 B：后端核心能力

### Task 15: Server API 完善 - 所有 CRUD 接口补齐真实数据库操作

**Files:**
- Modify: `AiGate-app/server/api/aigate/**/*.ts`

- [ ] **Step 1: 完善 Dashboard API**

实现真实的统计数据查询（Token 消耗趋势、模型分布、实时流量）

- [ ] **Step 2: 完善渠道 API 添加连通性测试**

新增 `POST /api/aigate/channel/test` 接口，验证端点连通性

- [ ] **Step 3: 完善 Agent API 添加工具/知识库绑定**

支持 Agent 创建时关联 MCP 工具和知识库

- [ ] **Step 4: Commit**

### Task 16: 知识库后端 - 文档处理与向量化

**Files:**
- Create: `AiGate-app/server/api/aigate/knowledge-base/[id]/documents.post.ts`
- Create: `AiGate-app/server/api/aigate/knowledge-base/[id]/search.get.ts`
- Modify: `AiGate-app/app/db/schema.ts`

- [ ] **Step 1: 添加文档表 Schema**

创建 `kb_document` 表：id, knowledge_base_id, name, type, size, status, chunks, created_at

- [ ] **Step 2: 实现文档上传 API**

接收文件，解析内容，存入数据库

- [ ] **Step 3: 实现检索测试 API**

接收查询文本，返回 Top-K 相似片段（占位实现，后续接向量库）

- [ ] **Step 4: Commit**

### Task 17: MCP 工具配置与健康检查

**Files:**
- Modify: `AiGate-app/server/api/aigate/mcp-tool/`

- [ ] **Step 1: 实现健康检查 API**

新增 `POST /api/aigate/mcp-tool/[id]/health` 接口

- [ ] **Step 2: 实现配置验证**

验证 MCP 工具配置格式正确性

- [ ] **Step 3: Commit**

---

## 阶段 C：体验优化

### Task 18: 全局体验提升

- [ ] **Step 1: 所有列表页添加空状态**

使用 Nuxt UI 的 EmptyState 组件，显示图标 + 文字 + 主操作按钮

- [ ] **Step 2: 所有异步操作添加加载骨架屏**

使用 Skeleton 组件替代 loading spinner

- [ ] **Step 3: 危险操作统一使用 ConfirmDialog**

删除、吊销等操作统一使用二次确认弹窗

- [ ] **Step 4: Commit**

### Task 19: 响应式适配

- [ ] **Step 1: 1024px 断点适配**

侧边栏自动折叠，表格切换为卡片视图

- [ ] **Step 2: 移动端适配（基础）**

顶栏汉堡菜单，表格横向滚动

- [ ] **Step 3: Commit**

---

## 优先级排序

| 优先级 | Task | 预估工时 | 说明 |
|--------|------|----------|------|
| **P0** | Task 13: 我的工作台 | 2h | 员工端首页 |
| **P0** | Task 14: 错误页面 | 1h | 基础体验 |
| **P0** | Task 1: Dashboard 增强 | 3h | 核心看板 |
| **P0** | Task 9: 告警中心重构 | 2h | 运营必备 |
| **P0** | Task 10: API 日志增强 | 3h | 排查必备 |
| **P1** | Task 2: 渠道管理增强 | 3h | 网关核心 |
| **P1** | Task 3: 密钥管理增强 | 2h | 安全核心 |
| **P1** | Task 6: Agent 引擎增强 | 4h | AI 核心 |
| **P1** | Task 7: 知识库增强 | 4h | RAG 核心 |
| **P1** | Task 8: 提示词库增强 | 2h | 效率工具 |
| **P1** | Task 15: Server API 完善 | 5h | 后端补齐 |
| **P2** | Task 4: 模型管理增强 | 2h | 辅助功能 |
| **P2** | Task 5: MCP 工具增强 | 2h | 扩展功能 |
| **P2** | Task 11: 账单管理增强 | 2h | 商业化 |
| **P2** | Task 12: 组织配额增强 | 2h | 多租户 |
| **P2** | Task 16: 知识库后端 | 4h | 向量化 |
| **P2** | Task 17: MCP 健康检查 | 2h | 可靠性 |
| **P3** | Task 18: 全局体验提升 | 3h | 打磨 |
| **P3** | Task 19: 响应式适配 | 3h | 移动端 |

**总预估工时：~50h**