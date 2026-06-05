/**
 * Sentry 轻量封装：未安装 @sentry/node 时仅在有 DSN 时 console.error 并预留集成点。
 */

interface ICaptureContext {
  event?: import('h3').H3Event
  extra?: Record<string, unknown>
}

function isSentryEnabled(): boolean {
  const config = useRuntimeConfig()
  return Boolean(config.sentryDsn)
}

export function captureException(error: unknown, context?: ICaptureContext): void {
  if (!isSentryEnabled())
    return

  console.error('[Sentry placeholder] captureException:', error, context)
  // TODO: 安装 @sentry/node 或 @sentry/nuxt 后调用 Sentry.captureException(error, { extra: context })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'error'): void {
  if (!isSentryEnabled())
    return

  console.error('[Sentry placeholder] captureMessage:', { message, level })
  // TODO: 安装 SDK 后调用 Sentry.captureMessage(message, level)
}
