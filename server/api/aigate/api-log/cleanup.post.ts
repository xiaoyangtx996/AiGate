import { cleanupOldApiLogs } from '#server/utils/log-cleanup'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '仅管理员可执行此操作', { statusCode: 403 })
    }
    const result = await cleanupOldApiLogs()
    return responseSuccess(result)
  } catch (err) {
    return responseError(err)
  }
})
