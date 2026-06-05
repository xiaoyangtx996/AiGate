# GitHub Actions Secrets 配置

在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置以下密钥。

## 必需 / 推荐

| Secret | 用途 | 说明 |
|--------|------|------|
| `CODECOV_TOKEN` | CI 覆盖率上传 | 在 [codecov.io](https://codecov.io) 关联仓库后获取；`ci.yml` 中 `codecov/codecov-action` 使用 |
| `SENTRY_DSN` | 生产错误监控 | 生产环境 Sentry 项目 DSN；部署时注入容器/PM2 环境，**非** GitHub Actions 运行时必需，但应在生产 Secret 或 K8s Secret 中配置 |

## 可选（按部署方式）

| Secret | 用途 | 说明 |
|--------|------|------|
| `VERCEL_TOKEN` | Vercel 部署 | 若使用 Vercel 托管前端/全栈，在此填入 Personal Access Token；当前默认流程为 GHCR + Docker Compose/K8s，此项为**占位**，可按需启用 |
| `DATABASE_URL` | 生产数据库 | 供 `database.yml` 或自定义迁移/部署工作流使用 |
| `BETTER_AUTH_SECRET` | 认证密钥 | 生产构建或部署注入，至少 32 字符 |

## 内置 Token

- `GITHUB_TOKEN`：由 Actions 自动提供，用于登录 GHCR 并推送镜像（`deploy.yml` / `release.yml`），无需手动创建。

## 生产环境变量（非 GitHub Secret）

以下变量应在生产主机 `.env`、Docker Compose `env_file` 或 K8s `aigate-secrets` 中配置，完整清单见 [部署指南](./README.md)：

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NODE_ENV=production`
- `SENTRY_DSN`（推荐）

本地开发复制 `.env.example` 即可，勿将生产密钥提交到仓库。
