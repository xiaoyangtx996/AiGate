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

## Docker 部署

### 构建镜像

在仓库根目录执行（构建上下文为 `AiGate-app`）：

```bash
docker build -f AiGate-app/Dockerfile \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/aigate" \
  --build-arg BETTER_AUTH_SECRET="your-production-secret-min-32-chars" \
  -t aigate:latest \
  AiGate-app
```

或在 `AiGate-app` 目录下：

```bash
cd AiGate-app
docker build \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/aigate" \
  --build-arg BETTER_AUTH_SECRET="your-production-secret-min-32-chars" \
  -t aigate:latest .
```

### 运行容器

```bash
docker run -d \
  --name aigate \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/aigate" \
  -e BETTER_AUTH_SECRET="your-production-secret-min-32-chars" \
  -e BETTER_AUTH_URL="https://your-domain.com" \
  -e SENTRY_DSN="https://xxx@sentry.io/xxx" \
  aigate:latest
```

应用默认监听 `0.0.0.0:3000`。生产环境请通过 `-e` 或 `--env-file` 注入 `.env.example` 中列出的全部必要变量。

### CI/CD

- **CI**（`.github/workflows/ci.yml`）：lint、单元测试、E2E、构建；覆盖率上传至 Codecov（需配置 `CODECOV_TOKEN` secret）。
- **Deploy**（`.github/workflows/deploy.yml`）：main 分支推送后构建应用并打包 Docker 镜像（占位，需接入实际 registry 与部署目标）。

## API 文档

- 浏览器访问：`http://localhost:5173/docs/api`（Swagger UI，基于 OpenAPI 规范）
- 原始 JSON：`GET /api/openapi`
- 侧边栏入口：Hub → API 文档

贡献流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
