import { and, eq } from 'drizzle-orm'
import { toPublicMcpTool } from '#server/utils/mcp-tool-config'
import { db } from '@/db/drizzle'
import { mcpTool, mcpToolVersion } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const where
      = !principal.isAdmin && principal.organizationId
        ? and(eq(mcpTool.id, id!), eq(mcpTool.organizationId, principal.organizationId))
        : eq(mcpTool.id, id!)
    const [tool] = await db.select().from(mcpTool).where(where)
    if (!tool) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }

    const versions = await db.select().from(mcpToolVersion).where(eq(mcpToolVersion.toolId, tool.id))
    return responseSuccess(toPublicMcpTool({ ...tool, versions }))
  }
  catch (err) {
    return responseError(err)
  }
})
