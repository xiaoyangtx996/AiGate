import { toPublicMcpTool } from '#server/utils/mcp-tool-config'
import { installMcpPreset } from '#server/utils/mcp-marketplace'
import { db } from '@/db/drizzle'

interface BatchInstallItem {
  slug?: string
  env?: Record<string, string>
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const body = await readBody(event).catch(() => [])
    if (!Array.isArray(body)) {
      return responseError(null, '请求体必须是安装数组', { statusCode: 400 })
    }

    const data = await db.transaction(async (tx) => {
      const results = []
      for (const item of body as BatchInstallItem[]) {
        if (!item.slug)
          throw createError({ statusCode: 400, statusMessage: '缺少 slug' })
        const tool = await installMcpPreset(item.slug, item.env || {}, principal.organizationId, tx)
        results.push({ slug: item.slug, success: true, tool: toPublicMcpTool(tool) })
      }
      return {
        total: results.length,
        success: results.length,
        failed: 0,
        results,
      }
    })

    return responseSuccess(data)
  }
  catch (err) {
    return responseError(err)
  }
})
