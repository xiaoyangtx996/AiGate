import { syncErrorResponseStatus } from '#server/utils/error-response-status'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    syncErrorResponseStatus(event, response)
  })
})
