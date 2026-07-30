import { installMcpPreset } from '#server/utils/mcp-marketplace'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const slug = getRouterParam(event, 'slug')
    const body = await readBody(event).catch(() => ({}))
    const env = (body?.env || {}) as Record<string, string>
    const res = await installMcpPreset(slug!, env, principal.organizationId)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
