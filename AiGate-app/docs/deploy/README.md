# AiGate 生产部署指南

本文档说明 AiGate 在生产环境的常见部署方式：Docker Compose、GHCR 镜像拉取、Kubernetes 与 PM2 进程管理。

相关文档：

- [Kubernetes 部署模板](./k8s/README.md) — `deployment.yaml` / `service.yaml` 占位清单
- [GitHub Actions Secrets](./SECRETS.md) — CI/CD 与生产环境密钥配置

## 环境变量清单

部署前请准备以下变量（完整说明见项目根目录 `.env.example`）：

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | 是 | PostgreSQL 连接串，生产建议使用 SSL |
| `BETTER_AUTH_SECRET` | 是 | 认证密钥，至少 32 字符 |
| `BETTER_AUTH_URL` | 是 | 公网访问地址，如 `https://aigate.example.com` |
| `BETTER_AUTH_ADMIN_USER_IDS` | 否 | 管理员用户 ID，逗号分隔 |
| `NUXT_APP_NAME` | 否 | 应用名称，默认 AiGate |
| `NUXT_APP_DESC` | 否 | 应用描述 |
| `NODE_ENV` | 是 | 生产环境设为 `production` |
| `SENTRY_DSN` | 推荐 | Sentry 错误监控 DSN |
| `NUXT_RESEND_API_KEY` | 否 | Resend 邮件 API Key |
| `NUXT_RESEND_FROM` | 否 | 发件人地址 |
| `GITHUB_TOKEN` | 否 | 服务端获取 GitHub Release |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | 否 | GitHub OAuth |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 否 | Google OAuth |

## 数据库迁移

每次发布新版本前，在目标环境执行 Drizzle 迁移，并应用补充 SQL（Phase 2 表/索引、0008 `role_ids`、Phase 3 索引）：

```bash
cd AiGate-app
export DATABASE_URL="postgresql://user:pass@host:5432/aigate"
pnpm dlx drizzle-kit migrate
node scripts/apply-all-migrations.mjs
```

`apply-all-migrations.mjs` 会依次执行 Phase 2 表与索引、迁移 `0008_add_api_key_role_ids.sql`、Phase 3 额外索引；可重复运行（`IF NOT EXISTS`）。CI、`release.yml` 与 `e2e.yml` 在 build/E2E 前均会调用该脚本。

`database.yml` 仅校验 Drizzle 迁移；若仅需 Phase 3 索引，可单独运行 `node scripts/apply-phase3-indexes.mjs`。

### v1.7.3 发布说明

- **E2E**：23 项 Playwright 用例全部通过；`ci.yml` 在 build 前自动跑 E2E
- **迁移**：统一 `apply-all-migrations.mjs`，Release 打 `v*` 标签前与 CI 一致执行 Drizzle + 补充迁移
- **可选 E2E 工作流**：`e2e.yml` 支持 Actions 手动触发；push 到 `main` 时仅在 commit message 含 `[e2e]` 时运行
- **镜像**：推送 `v1.7.3` 标签后，`release.yml` 在 `test:coverage` 与迁移通过后构建并推送 `ghcr.io/<owner>/<repo>/aigate:v1.7.3`

---

## 方式一：Docker Compose（推荐）

### 1. 构建镜像（本地）

```bash
docker build -f AiGate-app/Dockerfile \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/aigate" \
  --build-arg BETTER_AUTH_SECRET="your-production-secret-min-32-chars" \
  -t aigate:latest \
  AiGate-app
```

### 2. 使用 GHCR 镜像（CI 自动推送）

main 分支推送后，`deploy.yml` 会将镜像推送到：

```
ghcr.io/<owner>/<repo>/aigate:latest
```

打 `v*` 标签时，`release.yml` 推送：

```
ghcr.io/<owner>/<repo>/aigate:<tag>
```

登录并拉取：

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u <username> --password-stdin
docker pull ghcr.io/<owner>/<repo>/aigate:latest
```

### 3. 生产 compose 示例

仓库已提供 [`docker-compose.prod.yml`](../../docker-compose.prod.yml)，使用 GHCR 镜像与 `.env`：

```bash
cp .env.example .env   # 填写生产变量
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

> 生产环境请使用外部托管 PostgreSQL（RDS 等），勿将数据库与密钥硬编码在 compose 文件中。

### 4. 更新生产服务

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

镜像内置 `HEALTHCHECK`（`curl` 检测 `:3000`），可用 `docker ps` 查看健康状态。

---

## 方式二：Kubernetes

占位清单见 [`k8s/`](./k8s/README.md)。简要步骤：

```bash
# 创建 Secret 后
kubectl apply -f docs/deploy/k8s/deployment.yaml
kubectl apply -f docs/deploy/k8s/service.yaml
```

镜像默认 `ghcr.io/<owner>/<repo>/aigate:latest`，端口 `3000`，环境变量来自 `aigate-secrets`。

---

## 方式三：PM2

适用于已有 Node.js 运行环境、不使用容器的场景。

### 1. 构建与迁移

```bash
cd AiGate-app
pnpm install --frozen-lockfile
export DATABASE_URL="postgresql://..."
export BETTER_AUTH_SECRET="..."
pnpm dlx drizzle-kit migrate
pnpm build
```

### 2. 启动

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 首次配置开机自启
```

### 3. 滚动更新

```bash
git pull
pnpm install --frozen-lockfile
pnpm dlx drizzle-kit migrate
pnpm build
pm2 reload ecosystem.config.cjs
```

`ecosystem.config.cjs` 默认 `cluster` 模式、`instances: 1`，入口为 `.output/server/index.mjs`。

---

## 反向代理与 TLS

应用监听 `0.0.0.0:3000`。生产环境建议在 Nginx / Caddy 前终止 TLS，并将 `BETTER_AUTH_URL` 设为 HTTPS 公网地址。

## CI/CD 流水线

| 工作流 | 触发 | 作用 |
|--------|------|------|
| `ci.yml` | push/PR → main、develop | lint、测试、迁移、E2E、构建 |
| `deploy.yml` | push → main | 构建并推送 `aigate:latest` 至 GHCR |
| `release.yml` | 推送 `v*` 标签 | 覆盖率门禁 + 迁移通过后构建并推送 `aigate:<tag>` 至 GHCR |
| `e2e.yml` | 手动 / push main（commit 含 `[e2e]`） | 独立 Playwright E2E（Postgres + 迁移 + `test:e2e`） |
| `database.yml` | push → main | 校验 Drizzle 数据库迁移 |

更多开发说明见 [DEVELOPMENT.md](../DEVELOPMENT.md)。
