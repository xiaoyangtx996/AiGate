import { runDailyAlertChecks } from '#server/utils/alerts'

export default defineTask({
  meta: {
    name: 'alerts:daily',
    description: 'Run daily alert checks',
  },
  run: async () => {
    await runDailyAlertChecks()
    return { result: 'ok' }
  },
})
