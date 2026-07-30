import { MCP_MARKETPLACE_PRESETS } from '#server/utils/mcp-marketplace'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    let installed: Array<{ sourceSlug: string | null, organizationId: string | null }> = []
    try {
      installed = await db.select({ sourceSlug: mcpTool.sourceSlug, organizationId: mcpTool.organizationId }).from(mcpTool)
    }
    catch {}
    const data = MCP_MARKETPLACE_PRESETS.map((preset) => {
      const rows = installed.filter(item => item.sourceSlug === preset.slug)
      return {
        ...preset,
        installCount: rows.length,
        installed: rows.some(item => item.organizationId === (principal?.organizationId ?? null)),
      }
    })
    return responseSuccess(data)
  }
  catch (err) {
    return responseError(err)
  }
})
