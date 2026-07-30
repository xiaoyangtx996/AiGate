import * as Sentry from '@sentry/node'

interface ICaptureContext {
  event?: import('h3').H3Event
  extra?: Record<string, unknown>
}

let initialized = false

function isHttpClientError(error: unknown) {
  if (!error || typeof error !== 'object')
    return false

  const statusCode = 'statusCode' in error ? Number(error.statusCode) : 0
  return statusCode >= 400 && statusCode < 500
}

function shouldIgnoreError(error: unknown) {
  if (isHttpClientError(error))
    return true

  const message = error instanceof Error ? error.message : String(error)
  return message === 'Unauthorized' || message === 'Forbidden'
}

function ensureSentryInit(): boolean {
  const config = useRuntimeConfig()
  if (!config.sentryDsn) return false

  if (!initialized) {
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.env || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      ignoreErrors: ['Unauthorized', 'Forbidden'],
      beforeSend(event, hint) {
        if (hint.originalException && shouldIgnoreError(hint.originalException))
          return null

        return event
      },
    })
    initialized = true
  }

  return true
}

export function captureException(error: unknown, context?: ICaptureContext): void {
  if (shouldIgnoreError(error))
    return

  if (!ensureSentryInit()) return

  Sentry.captureException(error, {
    extra: context?.extra,
  })
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'error'): void {
  if (!ensureSentryInit()) return

  Sentry.captureMessage(message, level)
}
