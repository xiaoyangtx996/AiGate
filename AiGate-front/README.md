# AiGate Frontend

企业级 AI 全栈管控平台前端

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Vite | 5.x | 构建工具 |
| Tailwind CSS | 4.x | 样式框架 |
| Zustand | 4.x | 状态管理 |
| React Router | 6.x | 路由 |
| i18next | 23.x | 国际化 |
| ECharts | 5.x | 图表 |
| Lucide | - | 图标库 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

访问 http://localhost:3000

## 项目结构

```
AiGate-front/
├── public/                    # 静态资源
├── src/
│   ├── components/            # 组件
│   │   ├── layout/            # 布局组件
│   │   │   ├── MasterNav.tsx  # 顶部导航
│   │   │   ├── Sidebar.tsx    # 侧边栏
│   │   │   ├── MainLayout.tsx # 主布局
│   │   │   ├── PageHeader.tsx # 页眉
│   │   │   └── Breadcrumb.tsx # 面包屑
│   │   ├── ui/                # UI 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Drawer.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Stepper.tsx
│   │   │   ├── Timeline.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── charts/            # 图表组件
│   │   │   ├── LineChart.tsx
│   │   │   ├── PieChart.tsx
│   │   │   └── BarChart.tsx
│   │   └── search/
│   │       └── GlobalSearch.tsx
│   ├── pages/                 # 页面组件
│   │   ├── Dashboard.tsx      # 数据大盘
│   │   ├── MyWorkspace.tsx    # 我的工作台
│   │   ├── Organization.tsx   # 组织与配额
│   │   ├── Users.tsx          # 用户管理
│   │   ├── Keys.tsx           # 密钥管理
│   │   ├── Logs.tsx           # 调用日志
│   │   ├── Alerts.tsx         # 预警中心
│   │   ├── Knowledge.tsx      # 知识库
│   │   ├── Mcp.tsx            # MCP 工具
│   │   ├── Agent.tsx          # Agent 中心
│   │   ├── Prompts.tsx        # 提示词库
│   │   ├── Skills.tsx         # Skills 技能库
│   │   ├── Plugins.tsx        # Plugins 插件库
│   │   ├── Hooks.tsx          # Hooks 钩子库
│   │   ├── Settings.tsx       # 系统设置
│   │   ├── Channels.tsx       # 渠道管理
│   │   ├── Models.tsx         # 模型资产
│   │   ├── Billing.tsx        # 消耗报表
│   │   ├── Subscription.tsx   # 套餐计费
│   │   ├── QuotaApproval.tsx  # 配额审批
│   │   ├── Audit.tsx          # 操作审计
│   │   ├── Status.tsx         # 系统状态
│   │   ├── Developer.tsx      # 开发者中心
│   │   ├── Onboarding.tsx     # 入驻向导
│   │   ├── Profile.tsx        # 个人中心
│   │   ├── DesignSystem.tsx   # 设计系统
│   │   ├── MenuManage.tsx     # 菜单管理
│   │   ├── RoleManage.tsx     # 角色管理
│   │   └── errors/            # 错误页面
│   │       ├── NotFound.tsx
│   │       ├── Forbidden.tsx
│   │       └── ServerError.tsx
│   ├── stores/                # Zustand 状态
│   │   ├── theme.ts           # 主题状态
│   │   ├── auth.ts            # 认证状态
│   │   └── ui.ts              # UI 状态
│   ├── hooks/                 # 自定义 Hooks
│   │   ├── useTheme.ts
│   │   ├── useAuth.ts
│   │   ├── useRole.ts
│   │   └── useKeyboard.ts
│   ├── utils/                 # 工具函数
│   │   ├── chartTheme.ts
│   │   └── lazyEcharts.ts
│   ├── i18n/                  # 国际化配置
│   │   └── index.ts
│   ├── locales/               # 翻译文件
│   │   ├── zh/                # 中文
│   │   ├── en/                # 英文
│   │   └── ja/                # 日文
│   ├── App.tsx                # 根组件
│   ├── main.tsx               # 入口文件
│   └── index.css              # 全局样式
├── index.html                 # HTML 模板
├── package.json               # 依赖配置
├── tsconfig.json              # TypeScript 配置
├── vite.config.ts             # Vite 配置
└── README.md                  # 项目说明
```

## 功能特性

### 核心功能

- **数据大盘** - 运营数据可视化，ECharts 图表
- **组织管理** - 四级组织结构，配额分配
- **用户管理** - 用户 CRUD，角色分配，批量导入
- **密钥管理** - API Key 生命周期管理
- **调用日志** - 多维筛选，详情抽屉，导出功能
- **预警中心** - 分类 Tab，处置工作流
- **知识库** - 项目维度，文档管理，RAG 策略
- **MCP 工具** - 公共/私有市场，健康监控
- **Agent 中心** - 创建向导，对话窗口
- **提示词库** - 变量预览，沙箱调试，A/B 对比

### 系统功能

- **系统设置** - 11 个 Tab 配置
- **渠道管理** - 连通性测试，OAuth 池
- **模型资产** - 定价配置，可见性策略
- **消耗报表** - 多维下钻，月报导出
- **套餐计费** - 套餐卡片，用量进度
- **配额审批** - 双视角，审批工作流
- **操作审计** - 多维筛选，Diff 视图
- **系统状态** - 健康监控，自动刷新
- **开发者中心** - 接入指南，API 文档
- **菜单管理** - 树形结构，拖拽排序
- **角色管理** - CRUD，权限分配

### UI 特性

- **三主题** - Dark / Light / Apple
- **国际化** - 中文 / English / 日本語
- **响应式** - 移动端适配
- **组件库** - 13 个通用组件
- **图表** - ECharts 按需加载
- **性能** - 路由懒加载，chunk 拆分

## 设计规范

### 颜色系统

```css
/* Dark 主题 */
--brand-main: #10b981    /* 品牌主色 */
--brand-accent: #f59e0b  /* 强调色 */
--bg-body: #09090b       /* 页面背景 */
--bg-surface: #18181b    /* 卡片背景 */

/* Light 主题 */
--brand-main: #ea580c
--brand-accent: #059669

/* Apple 主题 */
--brand-main: #0066cc
--brand-accent: #ff3b30
```

### 禁止事项

- ❌ 使用紫蓝渐变色
- ❌ 使用 Emoji
- ❌ 硬编码颜色值
- ❌ 使用 Heroicons

### 必须遵守

- ✅ 使用 CSS 变量
- ✅ 使用 Lucide 图标
- ✅ 支持三主题切换
- ✅ 支持国际化

## 开发规范

### 提交规范

```bash
# 功能开发
git commit -m "feat: 添加登录页面"

# Bug 修复
git commit -m "fix: 修复面包屑点击问题"

# 文档更新
git commit -m "docs: 更新 README"

# 样式调整
git commit -m "style: 优化侧边栏样式"
```

### 组件规范

- 使用 TypeScript
- 使用 CSS 变量
- 支持三主题
- 支持国际化
- 使用 Lucide 图标

## 环境变量

```env
VITE_API_BASE_URL=/api
```

## 部署

```bash
# 构建
npm run build

# 预览
npm run preview
```

构建产物在 `dist/` 目录。

## 许可证

私有项目，未经授权禁止使用。
