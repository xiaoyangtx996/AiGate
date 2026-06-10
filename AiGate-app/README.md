# AiGate

Enterprise AI Management Platform — Nuxt 4 全栈应用。

## 环境要求

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

## 快速开始

```bash
cp .env.example .env   # 配置 DATABASE_URL、BETTER_AUTH_SECRET 等
pnpm install
pnpm dlx drizzle-kit migrate
pnpm dev               # http://localhost:5173
```

## 数据库迁移

```bash
# 应用已有迁移
pnpm dlx drizzle-kit migrate

# 开发环境快速同步 schema（慎用生产）
pnpm dlx drizzle-kit push

# 校验迁移一致性 + 补充 SQL dry-run
node scripts/verify-migration-consistency.mjs
node scripts/apply-all-migrations.mjs --dry-run
```

## 测试

项目使用 [Vitest](https://vitest.dev/) 进行单元测试，覆盖 `server/utils`、API handler、前端工具函数等。

```bash
pnpm exec vitest run      # 全部单元测试
pnpm test                 # 监听模式
pnpm test:coverage        # 覆盖率报告（门槛见 vitest.config.ts）
pnpm test:openapi         # OpenAPI 契约覆盖校验
pnpm test:e2e             # Playwright E2E
pnpm test:smoke           # 页面冒烟（需 dev 服务，结果写入 scripts/page-smoke-test-result-latest.txt）
```

| 路径 | 说明 |
|------|------|
| `server/**/__tests__/` | Server 工具与 API handler 测试 |
| `app/**/__tests__/` | 前端工具与 composable 测试 |
| `shared/**/__tests__/` | 共享模块测试 |
| `scripts/**/__tests__/` | 脚本校验测试 |
| `e2e/` | Playwright 端到端测试 |

API handler 测试通过 `vitest.setup.ts` 注入 Nitro 全局并对 DB 进行 mock，无需启动完整 Nuxt 服务。

## 代码检查

```bash
pnpm lint
pnpm lint:fix
pnpm typecheck:server          # 生产 server 类型
pnpm typecheck:server:test     # server 测试类型
pnpm exec nuxt typecheck       # 前端 Vue 类型
```

提交前通过 Husky + lint-staged 对暂存文件执行 ESLint。

## 构建

```bash
pnpm build
pnpm preview
```

构建需正确配置 `DATABASE_URL` 与 `BETTER_AUTH_SECRET`。

## 部署

完整生产部署说明见 **[docs/deploy/README.md](./docs/deploy/README.md)**。

```bash
# Docker 构建（仓库根目录）
docker build -f AiGate-app/Dockerfile \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/aigate" \
  --build-arg BETTER_AUTH_SECRET="your-production-secret-min-32-chars" \
  -t aigate:latest AiGate-app

# PM2
pnpm build && pm2 start ecosystem.config.cjs
```

CI/CD 工作流见仓库 `.github/workflows/`（`ci.yml`、`deploy.yml`、`release.yml`）。

## API 文档

- 浏览器：`http://localhost:5173/docs/api`
- OpenAPI JSON：`GET /api/openapi`

## 说明

- 仓库强制使用 `pnpm`。
- 大部分 API 需登录；`/api/auth`、`/api/_` 为公开路径。
- 组织管理、API Key、渠道、系统设置等路由仅管理员可访问。
- Sentry：设置 `SENTRY_DSN` 启用错误上报（见 [docs/MONITORING.md](./docs/MONITORING.md)）。

更多文档：

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 应用架构
- [CONTRIBUTING.md](./docs/CONTRIBUTING.md) — 贡献指南
- [../docs/specs/system-audit-and-optimization.md](../docs/specs/system-audit-and-optimization.md) — 系统审计与优化基线
