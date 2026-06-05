import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, endpoint, type } = body as { id?: string, endpoint?: string, type?: string }
    let targetEndpoint = endpoint
    let toolType = type || 'sse'

    if (id) {
      const [tool] = await db.select().from(mcpTool).where(eq(mcpTool.id, id))
      if (!tool) { return responseSuccess({ healthy: false, error: 'Tool not found' }) }
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
      const response = await fetch(targetEndpoint.replace(/\/$/, ''), {
        method: toolType === 'stdio' ? 'HEAD' : 'GET',
        signal: controller.signal,
      }).catch(() => null)
      clearTimeout(timeout)
      const latency = Date.now() - startTime
      const healthy = response ? response.status < 500 : false

      if (id) {
        await db.update(mcpTool).set({
          healthStatus: healthy ? 'healthy' : 'degraded',
          lastHealthCheck: new Date(),
        }).where(eq(mcpTool.id, id))
      }

      return responseSuccess({ healthy, latency, status: response?.status, checkedAt: new Date().toISOString() })
    }
    catch (err: any) {
      const latency = Date.now() - startTime
      if (id) {
        await db.update(mcpTool).set({
          healthStatus: 'down',
          lastHealthCheck: new Date(),
        }).where(eq(mcpTool.id, id))
      }
      return responseSuccess({ healthy: false, latency, error: err.message, checkedAt: new Date().toISOString() })
    }
  }
  catch (err) { return responseError(err) }
})
