# AiGate 开发指南

## 环境要求

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

## 安装

```bash
cd AiGate-app
cp .env.example .env
pnpm install
```

在 `.env` 中配置 `DATABASE_URL`、`BETTER_AUTH_SECRET` 等必要变量。

## 数据库迁移

```bash
# 应用已有迁移
pnpm dlx drizzle-kit migrate

# 开发环境快速同步 schema（慎用生产）
pnpm dlx drizzle-kit push
```

## 开发

```bash
pnpm dev
```

默认地址：`http://localhost:5173`

## 测试

```bash
# 运行测试
pnpm exec vitest run

# 带覆盖率报告
pnpm test:coverage
```

覆盖率报告输出至 `coverage/` 目录。

## 代码检查

```bash
pnpm lint
pnpm lint:fix
```

提交前会通过 Husky + lint-staged 自动对暂存文件执行 ESLint。

## 构建

```bash
pnpm build
pnpm preview   # 预览生产构建
```

构建需正确配置 `DATABASE_URL` 与 `BETTER_AUTH_SECRET`。

## 部署

完整生产部署说明见 **[docs/deploy/README.md](./deploy/README.md)**，涵盖 Docker Compose、GHCR 镜像拉取、PM2 与环境变量清单。

### 快速参考

**Docker 构建**（仓库根目录）：

```bash
docker build -f AiGate-app/Dockerfile \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/aigate" \
  --build-arg BETTER_AUTH_SECRET="your-production-secret-min-32-chars" \
  -t aigate:latest \
  AiGate-app
```

**生产更新**（Docker Compose + GHCR）：

```bash
docker compose pull
docker compose up -d
```

**PM2**（构建后启动）：

```bash
pnpm build
pm2 start ecosystem.config.cjs
```

镜像内置 `HEALTHCHECK`（检测 `:3000`）。发布前务必执行 `pnpm dlx drizzle-kit migrate`。

### Sentry

在 `.env` 中设置 `SENTRY_DSN` 即可启用前后端错误上报（见 [MONITORING.md](./MONITORING.md)）。本地开发可留空。

### CI/CD

| 工作流 | 说明 |
|--------|------|
| `ci.yml` | lint、单元测试、**数据库迁移**、E2E、构建；覆盖率上传 Codecov |
| `deploy.yml` | main 推送后构建并推送 `ghcr.io/<owner>/<repo>/aigate:latest` |
| `release.yml` | 推送 `v*` 标签时推送 `ghcr.io/<owner>/<repo>/aigate:<tag>` |
| `database.yml` | main 推送时校验迁移 |

发布标签示例：

```bash
git tag v1.7.1
git push origin v1.7.1
```

## API 文档

- 浏览器访问：`http://localhost:5173/docs/api`（Swagger UI，基于 OpenAPI 规范）
- 原始 JSON：`GET /api/openapi`
- 侧边栏入口：Hub → API 文档

贡献流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
