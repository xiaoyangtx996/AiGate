import { findMcpPreset } from '#server/utils/mcp-marketplace'

export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug')
    const preset = slug ? findMcpPreset(slug) : null
    if (!preset) {
      return responseError(null, '预设工具不存在', { statusCode: 404 })
    }
    return responseSuccess(preset)
  }
  catch (err) {
    return responseError(err)
  }
})
