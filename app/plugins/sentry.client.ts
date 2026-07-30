import * as Sentry from '@sentry/vue'

export default defineNuxtPlugin(nuxtApp => {
  const config = useRuntimeConfig()
  if (!config.public.sentryDsn) return

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn: config.public.sentryDsn,
    environment: config.public.env || 'production',
    tracesSampleRate: 0.1,
    ignoreErrors: ['Unauthorized', 'Forbidden', 'NetworkError', 'Failed to fetch'],
    beforeSend(event, hint) {
      const statusCode = Number(event.contexts?.response?.status_code || event.tags?.statusCode || 0)
      if (statusCode >= 400 && statusCode < 500)
        return null

      const message = hint.originalException instanceof Error ? hint.originalException.message : event.message
      if (message === 'Unauthorized' || message === 'Forbidden')
        return null

      return event
    },
  })
})
