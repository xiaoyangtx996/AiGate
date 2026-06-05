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

## API 文档

- 浏览器访问：`http://localhost:5173/docs/api`（Swagger UI，基于 OpenAPI 规范）
- 原始 JSON：`GET /api/openapi`
- 侧边栏入口：Hub → API 文档

贡献流程见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
