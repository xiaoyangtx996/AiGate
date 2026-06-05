import { db } from '@/db/drizzle'
import { insertMcpToolSchema, mcpTool } from '@/db/schema'
import { MCP_MARKETPLACE_PRESETS } from '#server/utils/mcp-marketplace'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const preset = MCP_MARKETPLACE_PRESETS.find(p => p.id === body.presetId)
    if (!preset) { return responseSuccess(null, '预设工具不存在', 404) }

    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const parsed = insertMcpToolSchema.parse({
      name: preset.name,
      description: preset.description,
      type: preset.type,
      config: { endpoint: preset.endpoint, vendor: preset.vendor, presetId: preset.id },
      status: 'active',
    })

    const [res] = await db.insert(mcpTool).values({
      ...parsed,
      ...(principal?.organizationId ? { organizationId: principal.organizationId } : {}),
    }).returning()

    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
