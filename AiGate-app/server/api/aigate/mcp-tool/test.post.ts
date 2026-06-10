import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

const trailingSlashPattern = /\/$/

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, endpoint, type } = body as { id?: string, endpoint?: string, type?: string }
    let targetEndpoint = endpoint
    let toolType = type || 'sse'

    if (id) {
      const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
      if (!principal?.isAdmin && !principal?.organizationId) {
        return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
      }

      const where = !principal.isAdmin && principal.organizationId
        ? and(eq(mcpTool.id, id), eq(mcpTool.organizationId, principal.organizationId))
        : eq(mcpTool.id, id)
      const [tool] = await db.select().from(mcpTool).where(where)
      if (!tool)
        return responseSuccess({ healthy: false, error: 'Tool not found' })
      const config = (tool.config || {}) as Record<string, string>
      targetEndpoint = config.endpoint || config.url || endpoint
      toolType = tool.type || toolType
    }

    if (!targetEndpoint) {
      return responseSuccess({ healthy: false, error: 'No endpoint configured' })
    }

    const startTime = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(targetEndpoint.replace(trailingSlashPattern, ''), {
        method: toolType === 'stdio' ? 'HEAD' : 'GET',
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timeout)
      const latency = Date.now() - startTime
      const healthy = response ? response.status < 500 : false

      if (id) {
        const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
        const where = principal && !principal.isAdmin && principal.organizationId
          ? and(eq(mcpTool.id, id), eq(mcpTool.organizationId, principal.organizationId))
          : eq(mcpTool.id, id)
        await db.update(mcpTool).set({
          healthStatus: healthy ? 'healthy' : 'degraded',
          lastHealthCheck: new Date(),
        }).where(where)
      }

      return responseSuccess({ healthy, latency, status: response?.status, checkedAt: new Date().toISOString() })
    }
    catch (err: any) {
      const latency = Date.now() - startTime
      if (id) {
        const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
        const where = principal && !principal.isAdmin && principal.organizationId
          ? and(eq(mcpTool.id, id), eq(mcpTool.organizationId, principal.organizationId))
          : eq(mcpTool.id, id)
        await db.update(mcpTool).set({
          healthStatus: 'down',
          lastHealthCheck: new Date(),
        }).where(where)
      }
      return responseSuccess({ healthy: false, latency, error: err.message, checkedAt: new Date().toISOString() })
    }
  }
  catch (err) { return responseError(err) }
})
