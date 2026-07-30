# AiGate Frontend

Demo 0 Vue 3 SPA。独立 Vite 构建，仅通过 HTTP 调用 Go API，不依赖 Go template、Nuxt 或 SSR。

```bash
cp .env.example .env
npm install
npm run dev
```

生产构建：`npm run build`。API 与网关地址分别由 `VITE_API_BASE_URL`、`VITE_GATEWAY_BASE_URL` 配置。

页面范围仅包含：登录、组织/用户、密钥/配额、调用日志与 CSV、告警收件箱、渠道凭证。KB、MCP、Agent 和 SSR 不在本里程碑内。

登录只输入邮箱和密码，由后端自动识别租户。仅当同一邮箱确实属于多个租户时显示租户名称选择；总公司平台账号登录后可在侧栏切换租户，普通租户用户不显示切换入口。
