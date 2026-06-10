# 监控与可观测性

## Sentry 错误追踪

AiGate 使用官方 Sentry SDK（`@sentry/node` 服务端、`@sentry/vue` 客户端）。仅在配置了 `SENTRY_DSN` 时初始化并上报，开发环境留空即可避免无效请求。

### 配置

1. 在 [Sentry](https://sentry.io) 创建项目，复制 **DSN**。
2. 在 `.env` 或部署平台环境变量中设置：

   ```bash
   SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
   ```

3. `nuxt.config.ts` 将 `SENTRY_DSN` 映射为：
   - `runtimeConfig.sentryDsn`（服务端）
   - `runtimeConfig.public.sentryDsn`（客户端插件）

   默认空字符串表示未启用。

### 实现位置

| 文件                           | 职责                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| `server/utils/sentry.ts`       | 懒加载 `Sentry.init`；`captureException` / `captureMessage` 调用真实 SDK |
| `server/plugins/00.sentry.ts`  | Nitro `error` 钩子，未捕获异常自动调用 `captureException`                |
| `app/plugins/sentry.client.ts` | `public.sentryDsn` 非空时初始化 `@sentry/vue`                            |

### 注意事项

- 未配置 `SENTRY_DSN` 时不初始化、不上报。
- 生产环境可在 `Sentry.init` 中配置 `tracesSampleRate`（如 `0.1`）控制性能采样。
- DSN 写入 GitHub Actions / 部署平台 Secrets，勿提交到仓库。
