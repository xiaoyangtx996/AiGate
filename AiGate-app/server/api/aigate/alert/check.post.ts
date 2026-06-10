import { runAlertChecks } from '#server/utils/alerts'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '仅管理员可执行此操作', { statusCode: 403 })
    }
    await runAlertChecks()
    return responseSuccess({ message: '告警检查完成' })
  }
  catch (err) { return responseError(err) }
})
