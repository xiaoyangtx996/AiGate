import { db } from '@/db/drizzle'
import { insertMcpToolSchema, mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    const body = await readBody(event)
    const parsed = insertMcpToolSchema.parse(body)
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    if (!principal?.isAdmin && parsed.organizationId && parsed.organizationId !== principal.organizationId) {
      return responseError(null, '无权向其他组织创建 MCP 工具', { statusCode: 403 })
    }

    const [res] = await db.insert(mcpTool).values({
      ...parsed,
      ...(principal?.organizationId && !parsed.organizationId ? { organizationId: principal.organizationId } : {}),
    }).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
