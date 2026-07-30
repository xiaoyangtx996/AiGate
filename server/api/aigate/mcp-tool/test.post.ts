import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

const privateHostPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
]
const toolsListPayload = {
  jsonrpc: '2.0',
  id: 'aigate-tools-list',
  method: 'tools/list',
  params: {},
}

function assertHttpUrl(value: string) {
  let url: URL
  try {
    url = new URL(value)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'serverUrl 格式无效' })
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'serverUrl 仅支持 http/https' })
  }
  if (privateHostPatterns.some(pattern => pattern.test(url.hostname))) {
    throw createError({ statusCode: 400, statusMessage: 'serverUrl 不允许指向内网或本机地址' })
  }
  return url
}

function extractTools(payload: any) {
  if (Array.isArray(payload?.result?.tools))
    return payload.result.tools
  if (Array.isArray(payload?.tools))
    return payload.tools
  if (Array.isArray(payload?.result))
    return payload.result
  return []
}

function parseSseJson(text: string) {
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: '))
      continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]')
      continue
    try {
      return JSON.parse(data)
    }
    catch {
      continue
    }
  }
  return null
}

async function readToolsList(response: Response) {
  const contentType = response.headers?.get?.('content-type') || ''
  try {
    if (contentType.includes('text/event-stream') && typeof response.text === 'function')
      return extractTools(parseSseJson(await response.text()))
    if (typeof response.json === 'function')
      return extractTools(await response.json())
    if (typeof response.text === 'function') {
      const text = await response.text()
      return extractTools(JSON.parse(text))
    }
  }
  catch {
    return []
  }
  return []
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { id, endpoint, type } = body as { id?: string, endpoint?: string, type?: string }
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    let targetEndpoint = endpoint
    let transportType = type || 'sse'
    let where

    if (id) {
      if (!principal?.isAdmin && !principal?.organizationId) {
        return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
      }

      where
        = principal && !principal.isAdmin && principal.organizationId
          ? and(eq(mcpTool.id, id), eq(mcpTool.organizationId, principal.organizationId))
          : eq(mcpTool.id, id)
      const [tool] = await db.select().from(mcpTool).where(where)
      if (!tool)
        return responseSuccess({ healthy: false, error: 'Tool not found' })
      const config = (tool.config || {}) as Record<string, string>
      targetEndpoint = tool.serverUrl || config.endpoint || config.url || endpoint
      transportType = tool.transportType || tool.type || transportType
    }

    if (transportType === 'stdio') {
      if (id && where) {
        await db
          .update(mcpTool)
          .set({
            connectionStatus: 'unknown',
            lastConnectedAt: null,
            lastError: 'stdio 仅客户端可测',
          })
          .where(where)
      }
      return responseSuccess({ healthy: false, skipped: true, reason: 'stdio 仅客户端可测' })
    }

    if (!targetEndpoint) {
      return responseSuccess({ healthy: false, error: 'No endpoint configured' })
    }

    const url = assertHttpUrl(targetEndpoint)
    const startTime = Date.now()
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json, text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toolsListPayload),
      })
      const latency = Date.now() - startTime
      const healthy = response.status < 500
      const error = healthy ? null : `HTTP ${response.status}`
      const tools = healthy ? await readToolsList(response as Response) : []

      if (id && where) {
        await db
          .update(mcpTool)
          .set({
            connectionStatus: healthy ? 'connected' : 'failed',
            healthStatus: healthy ? 'healthy' : 'degraded',
            lastHealthCheck: new Date(),
            lastConnectedAt: healthy ? new Date() : null,
            lastError: error,
          })
          .where(where)
      }

      return responseSuccess({
        healthy,
        latency,
        status: response.status,
        tools,
        checkedAt: new Date().toISOString(),
        error,
      })
    }
    catch (err) {
      const latency = Date.now() - startTime
      const message = err instanceof Error ? err.message : '连接失败'
      if (id && where) {
        await db
          .update(mcpTool)
          .set({
            connectionStatus: 'failed',
            healthStatus: 'down',
            lastHealthCheck: new Date(),
            lastConnectedAt: null,
            lastError: message,
          })
          .where(where)
      }
      return responseSuccess({ healthy: false, latency, error: message, checkedAt: new Date().toISOString() })
    }
  }
  catch (err) {
    return responseError(err)
  }
})
