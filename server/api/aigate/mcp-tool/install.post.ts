import { MCP_MARKETPLACE_PRESETS } from '#server/utils/mcp-marketplace'
import { db } from '@/db/drizzle'
import { insertMcpToolSchema, mcpTool } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const body = await readBody(event)
    const preset = MCP_MARKETPLACE_PRESETS.find(p => p.id === body.presetId)
    if (!preset) {
      return responseError(null, '预设工具不存在', { statusCode: 404 })
    }

    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const parsed = insertMcpToolSchema.parse({
      name: preset.name,
      description: preset.description,
      type: preset.type,
      config: { endpoint: preset.endpoint, vendor: preset.vendor, presetId: preset.id },
      status: 'active',
    })

    const [res] = await db
      .insert(mcpTool)
      .values({
        ...parsed,
        ...(principal?.organizationId ? { organizationId: principal.organizationId } : {}),
      })
      .returning()

    return responseSuccess(res)
  } catch (err) {
    return responseError(err)
  }
})
