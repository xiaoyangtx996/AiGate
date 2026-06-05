import { MCP_MARKETPLACE_PRESETS } from '#server/utils/mcp-marketplace'

export default defineEventHandler(async () => {
  return responseSuccess(MCP_MARKETPLACE_PRESETS)
})
