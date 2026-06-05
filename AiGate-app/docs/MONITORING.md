# 监控与可观测性

## Sentry 错误追踪（轻量接入）

AiGate 采用**无重型 SDK 依赖**的占位式 Sentry 集成：仅在配置了 `SENTRY_DSN` 时记录错误，便于后续无缝替换为官方 SDK。

### 配置

1. 在 [Sentry](https://sentry.io) 创建项目，复制 **DSN**。
2. 在 `.env` 或部署平台环境变量中设置：

   ```bash
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

3. `nuxt.config.ts` 的 `runtimeConfig.sentryDsn` 已映射该变量，默认空字符串表示未启用。

### 实现位置

| 文件 | 职责 |
|------|------|
| `server/utils/sentry.ts` | `captureException` / `captureMessage`；DSN 非空时 `console.error` 并预留 `TODO` |
| `server/plugins/00.sentry.ts` | Nitro `error` 钩子，未捕获异常自动调用 `captureException` |

### 启用完整 SDK（可选）

当需要生产级聚合、告警与性能追踪时：

```bash
pnpm add @sentry/nuxt
```

随后在 `server/utils/sentry.ts` 的 `TODO` 处接入 `Sentry.init({ dsn })` 与 `Sentry.captureException`，并可添加 `app/plugins/sentry.client.ts` 处理前端错误。

### 注意事项

- 未配置 `SENTRY_DSN` 时不初始化、不上报，避免开发环境无效请求。
- 生产环境建议配置 `tracesSampleRate`（如 `0.1`）控制性能采样。
- DSN 写入 GitHub Actions / 部署平台 Secrets，勿提交到仓库。
