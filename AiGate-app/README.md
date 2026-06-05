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

## 说明

- 当前仓库强制使用 `pnpm`，不再保留 `package-lock.json`。
- 大部分接口默认需要登录；`/api/auth`、`/api/_`、`/api/common/releases` 为公开路径。
- 组织管理、API Key、渠道、系统设置等路由仅允许管理员访问。
- 本地开发时请确保 `.env` 已正确配置，尤其是 `DATABASE_URL` 和 `BETTER_AUTH_SECRET`。
