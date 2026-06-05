# 监控与可观测性

## Sentry 错误追踪（占位配置）

AiGate 已在 `nuxt.config.ts` 的 `runtimeConfig` 中预留 `sentryDsn` 字段，默认空字符串表示未启用。

### 启用步骤

1. 在 [Sentry](https://sentry.io) 创建项目，复制 **DSN**。
2. 在 `.env` 或部署平台环境变量中设置：

   ```bash
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

3. 安装官方 SDK（后续集成时执行）：

   ```bash
   pnpm add @sentry/nuxt
   ```

4. 在 `app/plugins/sentry.client.ts` 与 `server/plugins/sentry.server.ts` 中调用 `Sentry.init({ dsn: useRuntimeConfig().sentryDsn })`。

### 注意事项

- 未配置 `SENTRY_DSN` 时不应初始化 Sentry，避免开发环境产生无效上报。
- 生产环境建议同时配置 `tracesSampleRate`（如 `0.1`）控制性能追踪采样率。
- DSN 可写入 GitHub Actions / Vercel Secrets，勿提交到仓库。
