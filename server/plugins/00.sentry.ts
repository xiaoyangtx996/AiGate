import { captureException } from '#server/utils/sentry'

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    captureException(error, { event })
  })
})
