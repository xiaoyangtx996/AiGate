import * as Sentry from '@sentry/node'

interface ICaptureContext {
  event?: import('h3').H3Event
  extra?: Record<string, unknown>
}

let initialized = false

function ensureSentryInit(): boolean {
  const config = useRuntimeConfig()
  if (!config.sentryDsn)
    return false

  if (!initialized) {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.env || process.env.NODE_ENV,
    })
    initialized = true
  }

  return true
}

export function captureException(error: unknown, context?: ICaptureContext): void {
  if (!ensureSentryInit())
    return

  Sentry.captureException(error, {
    extra: context?.extra,
  })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'error'): void {
  if (!ensureSentryInit())
    return

  Sentry.captureMessage(message, level)
}
