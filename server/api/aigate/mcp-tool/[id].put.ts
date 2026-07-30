import { and, eq } from 'drizzle-orm'
import { normalizeMcpToolPayload, toPublicMcpTool } from '#server/utils/mcp-tool-config'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null, userId?: string } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!principal.isAdmin && body.organizationId && body.organizationId !== principal.organizationId) {
      return responseError(null, '无权转移 MCP 工具到其他组织', { statusCode: 403 })
    }

    const where
      = !principal.isAdmin && principal.organizationId
        ? and(eq(mcpTool.id, id!), eq(mcpTool.organizationId, principal.organizationId))
        : eq(mcpTool.id, id!)
    const [before] = principal.userId ? await db.select().from(mcpTool).where(where) : []
    const [res] = await db.update(mcpTool).set(normalizeMcpToolPayload(body)).where(where).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    await auditLog(event, 'mcp_tool.update', { type: 'mcp_tool', id }, before ?? null, res)
    return responseSuccess(toPublicMcpTool(res))
  }
  catch (err) {
    return responseError(err)
  }
})
