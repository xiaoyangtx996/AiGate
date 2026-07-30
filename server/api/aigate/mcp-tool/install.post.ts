import { findMcpPreset, installMcpPreset } from '#server/utils/mcp-marketplace'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const slug = body?.slug || body?.presetId
    if (!slug) {
      return responseError(null, '缺少 presetId', { statusCode: 400 })
    }
    const preset = findMcpPreset(slug)
    if (!preset) {
      return responseError(null, '预设工具不存在', { statusCode: 404 })
    }

    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const env = body?.env || {}
    return responseSuccess(await installMcpPreset(slug, env, principal.organizationId))
  }
  catch (err) {
    return responseError(err)
  }
})
