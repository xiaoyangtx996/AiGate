# AiGate Frontend

AiGate Vue 3 管理控制台。独立 Vite 构建，仅通过 HTTP 调用 Go API，不依赖 Go template、Nuxt 或 SSR。

```bash
cp .env.example .env
npm install
npm run dev
```

生产构建：`npm run build`。API 与网关地址分别由 `VITE_API_BASE_URL`、`VITE_GATEWAY_BASE_URL` 配置。

Plan 07b 页面包括项目与成员、知识库文档状态/检索、MCP 市场与项目授权、项目 Agent 引用对话、LLM+MCP 用量/成本导出和管理助手。SSR 不在产品架构中。

Demo3：登录后进入「项目管理」选择部门建项目并授权成员；从项目进入「知识库」上传 `backend/testdata/samples/demo3-citation.pdf`（或 Markdown/TXT）并等待 `ready`；先 `go run ./cmd/devmcp`，再在「MCP 管理」安装市场条目或注册 `http://127.0.0.1:18100` 并显式授权项目（健康应为 healthy）；在「项目 Agent」绑定知识库和已授权 MCP 后对话（对话会自动 invoke 绑定 MCP 并产生用量）并检查引用；最后到「用量看板」与「管理助手」按 UTC 日核对汇总。完整本地服务启动步骤见根目录 README。先执行 `cd backend && go run ./cmd/migrate up`。

登录只输入邮箱和密码，由后端自动识别租户。仅当同一邮箱确实属于多个租户时显示租户名称选择；总公司平台账号登录后可在侧栏切换租户，普通租户用户不显示切换入口。
