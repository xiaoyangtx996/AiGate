import { and, eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const where =
      !principal.isAdmin && principal.organizationId
        ? and(eq(mcpTool.id, id!), eq(mcpTool.organizationId, principal.organizationId))
        : eq(mcpTool.id, id!)
    const [res] = await db.delete(mcpTool).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    await auditLog(event, 'mcp_tool.delete', { type: 'mcp_tool', id }, res, null)
    return responseSuccess(null)
  } catch (err) {
    return responseError(err)
  }
})
