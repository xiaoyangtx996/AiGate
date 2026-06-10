import * as Sentry from '@sentry/vue'

export default defineNuxtPlugin(nuxtApp => {
  const config = useRuntimeConfig()
  if (!config.public.sentryDsn) return

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn: config.public.sentryDsn,
    environment: config.public.env || 'production',
  })
})
