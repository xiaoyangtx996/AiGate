import { runRealtimeAlertChecks } from '#server/utils/alerts'

export default defineTask({
  meta: {
    name: 'alerts:realtime',
    description: 'Run realtime alert checks',
  },
  run: async () => {
    await runRealtimeAlertChecks()
    return { result: 'ok' }
  },
})
