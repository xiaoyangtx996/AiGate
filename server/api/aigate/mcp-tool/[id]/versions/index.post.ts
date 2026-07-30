import { and, eq } from 'drizzle-orm'
import { toPublicMcpTool } from '#server/utils/mcp-tool-config'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { insertMcpVersionSchema, mcpTool, mcpToolVersion } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = insertMcpVersionSchema.parse({
      ...body,
      toolId: id,
    })

    const where = principal.isAdmin
      ? eq(mcpTool.id, id!)
      : and(eq(mcpTool.id, id!), eq(mcpTool.organizationId, principal.organizationId!))
    const [tool] = await db.select().from(mcpTool).where(where)
    if (!tool)
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })

    const [version] = await db
      .insert(mcpToolVersion)
      .values({
        toolId: tool.id,
        version: parsed.version,
        config: parsed.config ?? {},
        changelog: parsed.changelog,
        active: parsed.active ?? false,
      })
      .returning()

    await auditLog(event, 'mcp_tool.version.create', { type: 'mcp_tool', id: tool.id }, null, version)
    return responseSuccess(version)
  }
  catch (err) {
    return responseError(err)
  }
})
