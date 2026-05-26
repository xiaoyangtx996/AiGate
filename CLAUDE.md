# AiGate v2.0 - 企业级 AI 全栈管控平台

> **项目定位**：面向中大型企业的 AI 调用统一网关、配额管理、资产市场与智能体平台  
> **技术栈**：Go (网关) + Python (管理API/RAG/Agent) + React + TypeScript (前端)  
> **当前阶段**：UI 原型设计与规范制定（准备转向生产实现）

---

## 项目概览

AiGate 是一个企业级 AI 全栈管控平台，提供：

- **统一 AI 网关**：OpenAI 兼容接口，支持多模型、多渠道、OAuth 多账号负载均衡
- **组织与配额管理**：四级组织结构（集团→分公司→部门→员工），配额守恒分配
- **密钥管理**：ag-{env}-{hex} 格式密钥，IP 白名单，生命周期管理
- **AI 资产市场**：提示词库、MCP 工具、Skills、Plugins、Hooks 五类资产
- **企业知识库 RAG**：项目级知识库，文档解析、向量化、混合检索
- **Agent 体系**：AiGate Bot（管理 Agent）+ 项目级 Agent
- **预警与审计**：12 类预警、180 天调用日志、365 天操作审计

---

## 目录结构

```
AiGate/
├── UI/                          # 前端 UI 原型（30+ HTML 页面）
│   ├── design-system.html       # 设计系统展示（三主题）
│   ├── dashboard.html           # 运营大盘
│   ├── organization.html        # 组织与配额
│   ├── keys.html                # 密钥管理
│   ├── knowledge.html           # 知识库
│   ├── agent.html               # Agent 中心
│   └── ...                      # 其他 30+ 页面
│
├── docs/                        # 项目文档
│   └── v2.0/
│       └── AiGate_UI_Design_Spec.md  # UI 设计规范（核心文档）
│
├── aigate_analysis.md           # 架构分析与技术方案
│
├── .claude/                     # Claude Code 配置
│   ├── settings.json            # 全局配置与 Hooks
│   ├── skills/                  # 自定义技能
│   │   ├── ui-component/        # UI 组件生成器
│   │   └── page-validator/      # 页面验证器
│   └── memory/                  # 项目记忆（自动生成）
│
└── .mcp.json                    # MCP 服务器配置（待创建）
```

---

## 核心设计规范

### 视觉系统

**三大主题**（通过 `<html class="dark|light|apple">` 切换）：

| 主题 | 主色 | 强调色 | 圆角 | 阴影 | 适用场景 |
|------|------|--------|------|------|----------|
| **暗黑科技** (dark) | Emerald `#10b981` | Amber `#f59e0b` | 0.75rem | 无 | 管理后台默认 |
| **杂志白亮** (light) | Orange `#ea580c` | Emerald `#059669` | 0 | `4px 4px 0 #111` | 印刷感、合规审计 |
| **Apple 拟物** (apple) | `#0066cc` | `#ff3b30` | 1.125rem | 毛玻璃 | 高端客户演示 |

**设计约束**（硬规则）：
- ❌ **禁止**紫蓝渐变色
- ❌ **禁止**使用 Emoji
- ✅ **必须**使用 Lucide SVG 图标
- ✅ **必须**使用 CSS 变量（`var(--brand-main)` 等）
- ✅ **必须**支持三主题切换
- ✅ 顶部导航栏**必须**有毛玻璃效果

### 技术栈

**前端**（生产实现）：
- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- ECharts 5（图表）
- Lucide（图标）
- React Hook Form + Zod（表单）

**当前原型**：
- HTML + Tailwind CSS v4
- 静态页面，用于设计验证

---

## Claude Code 自动化配置

### 已配置的自动化

#### 1. Hooks（自动触发）

**PostToolUse - 自动格式化**：
- 编辑或创建文件后自动运行 Prettier
- 配置：`.claude/settings.json`

**PreToolUse - 保护关键文件**：
- 修改设计规范文档前需要确认
- 修改架构分析文档前需要确认
- 修改 Claude 配置前需要确认

#### 2. 自定义 Skills

**`/ui-component`** - UI 组件生成器（用户调用）：
- 根据设计规范生成符合三主题的组件
- 自动添加到 `design-system.html`
- 支持：Drawer、Timeline、Stepper、PermissionMatrix、Toast、Modal、Table 等

**`page-validator`** - 页面验证器（Claude 自动调用）：
- 自动检查页面是否符合 12 项设计规范
- 生成详细的验证报告
- 提供具体的修复建议

#### 3. MCP 服务器（待安装）

**context7** - 实时文档查询：
```bash
claude mcp add context7
```
用于查询 Tailwind v4、React 18、ECharts 5、Lucide 等库的最新文档。

**GitHub MCP** - 代码协作：
```bash
# 前置：安装 GitHub CLI
winget install GitHub.cli

# 安装 MCP
claude mcp add github
```
用于管理 PR、Issue、提交记录。

---

## 开发工作流

### 创建新页面

1. **使用内置技能生成原型**：
   ```bash
   /huashu-design 根据 AiGate_UI_Design_Spec.md 第 5.X 节生成 [页面名称] 的高保真原型
   ```

2. **生成所需组件**：
   ```bash
   /ui-component component_name=Drawer component_type=drawer
   ```

3. **自动验证**：
   - Claude 完成页面后会自动调用 `page-validator` 检查 12 项规范
   - 查看验证报告，修复未通过项

4. **提交代码**：
   ```bash
   git add .
   git commit -m "feat: add [页面名称] page"
   ```

### 修改现有页面

1. **读取设计规范**：
   ```
   请根据 docs/v2.0/AiGate_UI_Design_Spec.md 第 X 章修改 [页面名称]
   ```

2. **自动格式化**：
   - 修改后 Prettier 会自动格式化代码（通过 PostToolUse Hook）

3. **验证修改**：
   ```
   请验证 [页面路径] 是否符合设计规范
   ```

### 生成组件

```bash
# 生成抽屉组件
/ui-component component_name=Drawer component_type=drawer

# 生成时间线组件
/ui-component component_name=Timeline component_type=timeline

# 生成权限矩阵
/ui-component component_name=PermissionMatrix component_type=matrix
```

---

## 角色与权限

系统支持五种角色，页面通过 `data-roles` 属性控制可见性：

| 角色 | 标识 | 权限范围 |
|------|------|----------|
| 集团 IT 管理员 | `sys_admin` | 全局所有功能 |
| 分公司管理员 | `tenant_admin` | 本公司范围 |
| 部门负责人 | `dept_lead` | 本部门范围 |
| 项目负责人 | `project_lead` | 本项目范围 |
| 普通员工 | `user` | 个人范围 |

**示例**：
```html
<!-- 仅集团 IT 和分公司管理员可见 -->
<button data-roles="sys_admin,tenant_admin">删除用户</button>

<!-- 页面底部调用角色过滤 -->
<script>
  applyRole(); // 根据当前角色显隐元素
</script>
```

---

## 页面清单

### 已完成（原型阶段）

| 页面 | 路径 | 完成度 | 说明 |
|------|------|--------|------|
| 设计系统 | `design-system.html` | 70% | 三主题展示 |
| 登录页 | `login.html` | 60% | 缺 SSO 入口 |
| 运营大盘 | `dashboard.html` | 80% | 缺真实图表 |
| 组织与配额 | `organization.html` | 65% | 缺守恒分配可视化 |
| 用户管理 | `users.html` | 60% | 缺批量导入 |
| 密钥管理 | `keys.html` | 60% | 缺 IP 白名单 UI |
| 调用日志 | `logs.html` | 55% | 缺多维过滤 |
| 知识库 | `knowledge.html` | 55% | 缺项目维度 |
| MCP 工具 | `mcp.html` | 45% | 缺公共/私有双 Tab |
| Agent 中心 | `agent.html` | 50% | 缺创建向导 |
| 预警中心 | `alerts.html` | 50% | 缺类型分组 |

### 待新建

| 页面 | 路径 | 优先级 | 说明 |
|------|------|--------|------|
| 我的工作台 | `my-workspace.html` | P0 | 员工端首页 |
| 首次入驻向导 | `onboarding.html` | P1 | 集团 IT 首次登录 |
| 提示词库 | `prompts.html` | P0 | AI 资产市场 |
| 提示词详情 | `prompts-detail.html` | P0 | 变量插槽预览 |
| 系统状态页 | `status.html` | P2 | 健康监控 |
| 开发者中心 | `developer.html` | P2 | 接入指南 |
| 配额申请审批 | `quota-approval.html` | P0 | 超额申请流程 |
| 套餐与计费 | `subscription.html` | P1 | 套餐管理 |
| 操作审计 | `audit.html` | P1 | 365 天审计日志 |

---

## 关键文档

### 必读文档

1. **UI 设计规范**：`docs/v2.0/AiGate_UI_Design_Spec.md`
   - 完整的设计系统、组件库、页面详细设计
   - 12 项设计走查清单
   - 开发前必读

2. **架构分析**：`aigate_analysis.md`
   - 技术选型、开源项目参考
   - 多租户架构、前端规范
   - MVP 分期建议

3. **设计系统展示**：`UI/design-system.html`
   - 三主题实时预览
   - 组件库展示
   - CSS 变量定义

### 快速参考

**颜色变量**：
```css
var(--bg-body)          /* 页面背景 */
var(--bg-surface)       /* 卡片背景 */
var(--border-color)     /* 边框颜色 */
var(--text-primary)     /* 主文本 */
var(--text-secondary)   /* 次要文本 */
var(--brand-main)       /* 品牌主色 */
var(--brand-accent)     /* 强调色 */
```

**常用组件类**：
```css
.card                   /* 卡片容器 */
.btn-primary            /* 主按钮 */
.btn-secondary          /* 次按钮 */
.badge-success          /* 成功徽章 */
.badge-warning          /* 警告徽章 */
```

---

## 常见任务

### 查询设计规范
```
请查看 docs/v2.0/AiGate_UI_Design_Spec.md 第 X 章，了解 [组件/页面] 的设计要求
```

### 生成新页面
```
根据 AiGate_UI_Design_Spec.md 第 5.X 节，生成 [页面名称] 页面
```

### 验证页面
```
请验证 UI/[页面名称].html 是否符合设计规范
```

### 生成组件
```
/ui-component component_name=[组件名] component_type=[类型]
```

### 查询库文档
```
Tailwind v4 如何实现毛玻璃效果？
ECharts 5 如何配置主题切换？
```

---

## 注意事项

### 开发规范

1. **始终使用 CSS 变量**：不要硬编码颜色值
2. **支持三主题**：所有新页面必须在三主题下测试
3. **无障碍优先**：键盘导航、屏幕阅读器、ARIA 属性
4. **响应式设计**：在 1024px / 1440px / 1920px 宽度下测试
5. **角色裁剪**：需要权限控制的元素添加 `data-roles` 属性

### 禁止事项

- ❌ 使用紫色、蓝色、靛蓝色渐变
- ❌ 使用 Emoji
- ❌ 硬编码颜色值（除非在 CSS 变量定义中）
- ❌ 使用 Heroicons 或其他图标库（统一用 Lucide）
- ❌ 跳过页面验证

### 提交规范

```bash
# 功能开发
git commit -m "feat: add [功能描述]"

# Bug 修复
git commit -m "fix: [问题描述]"

# 文档更新
git commit -m "docs: update [文档名称]"

# 样式调整
git commit -m "style: [调整描述]"
```

---

## 下一步计划

### 阶段 A：MVP UI 闭环（2026 Q3）

- [ ] 完善现有 30+ 页面（补齐缺失功能）
- [ ] 新建 9 个待建页面
- [ ] 沉淀通用组件库（Drawer、Timeline、Stepper 等）
- [ ] 接入 ECharts 5 真实图表
- [ ] 完成 12 项设计规范验证

### 阶段 B：生产实现（2026 Q4）

- [ ] 迁移到 React + TypeScript
- [ ] 对接后端 API
- [ ] 实现 SSO 登录
- [ ] 完善 MCP 市场
- [ ] 实现提示词库

### 阶段 C：规模化（2027 Q1+）

- [ ] 国际化（i18n）
- [ ] 移动端适配（PWA）
- [ ] 性能优化
- [ ] 开源准备

---

## 联系与支持

- **项目文档**：`docs/v2.0/`
- **设计规范**：`docs/v2.0/AiGate_UI_Design_Spec.md`
- **架构分析**：`aigate_analysis.md`
- **Claude Code 配置**：`.claude/`

---

**最后更新**：2026-05-20  
**文档版本**：v1.0
