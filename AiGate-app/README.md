# AiGate

## 环境要求

- Node.js 20+
- pnpm 9+
- PostgreSQL

## 开发

1. 复制环境变量
```bash
cp .env.example .env
```

2. 安装依赖
```bash
pnpm install
```

3. 初始化数据库
```bash
pnpm dlx drizzle-kit migrate
# 或快速同步
pnpm dlx drizzle-kit push
```

4. 启动开发服务
```bash
pnpm dev
```

默认开发端口：`http://localhost:5173`

## 测试

项目使用 [Vitest](https://vitest.dev/) 进行单元测试，覆盖 `server/utils` 工具函数与 `server/api/aigate` 核心 API handler。

### 运行测试

```bash
# 运行全部单元测试
pnpm exec vitest run

# 监听模式（开发时）
pnpm test

# 生成覆盖率报告（门槛见 vitest.config.ts，当前约 18%–20%）
pnpm test:coverage
```

覆盖率 HTML 报告输出至 `coverage/index.html`（已加入 `.gitignore`）。

### 测试目录

| 路径 | 说明 |
|------|------|
| `server/utils/__tests__/` | 工具函数纯逻辑与 mock 测试 |
| `server/api/aigate/__tests__/` | API handler mock 测试（管理员鉴权、分页查询、MCP 安装等） |
| `test/` | composable 导出工具、通用校验等辅助测试 |

API handler 测试通过 `vitest.setup.ts` 注入 Nitro 全局（`defineEventHandler`、`getQuery` 等），并对数据库与外部依赖进行 mock，无需启动完整 Nuxt 服务。

### E2E 测试

使用 [Playwright](https://playwright.dev/) 进行端到端测试。`playwright.config.ts` 会在本地自动启动 `pnpm dev`（端口 5173）；若已有开发服务在运行，将复用现有进程。

```bash
# 运行全部 E2E（冒烟 + 认证 + 公开 API 策略）
pnpm test:e2e

# 仅运行认证相关场景
pnpm exec playwright test e2e/auth.spec.ts

# 仅运行公开/受保护 API 策略
pnpm exec playwright test e2e/public-api.spec.ts

# 带 UI 调试
pnpm exec playwright test --ui
```

| 路径 | 说明 |
|------|------|
| `e2e/smoke.spec.ts` | 首页、登录页、OpenAPI、文档页冒烟 |
| `e2e/auth.spec.ts` | 注册/登录表单可见性、错误密码不崩溃 |
| `e2e/public-api.spec.ts` | `/api/openapi`、搜索接口鉴权行为 |

## 说明

- 当前仓库强制使用 `pnpm`，不再保留 `package-lock.json`。
- 大部分接口默认需要登录；`/api/auth`、`/api/_`、`/api/common/releases` 为公开路径。
- 组织管理、API Key、渠道、系统设置等路由仅允许管理员访问。
- 本地开发时请确保 `.env` 已正确配置，尤其是 `DATABASE_URL` 和 `BETTER_AUTH_SECRET`。
