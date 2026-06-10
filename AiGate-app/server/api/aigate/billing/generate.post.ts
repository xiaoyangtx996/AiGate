import { generateBillingForPeriod, getCurrentPeriod } from '#server/utils/billing'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '仅管理员可执行此操作', { statusCode: 403 })
    }
    const body = await readBody(event).catch(() => ({}))
    const period = body?.period || await getCurrentPeriod()
    const result = await generateBillingForPeriod(period)
    return responseSuccess(result)
  }
  catch (err) { return responseError(err) }
})
