import { channelPresets } from '#server/utils/gateway-channel'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    return responseSuccess(channelPresets)
  }
  catch (err) {
    return responseError(err)
  }
})
