import { UAParser } from 'ua-parser-js'
import { sanitizeLogData } from '#server/utils/logs'
import { db } from '@/db/drizzle'
import { logs } from '@/db/schema'

export default defineEventHandler(async event => {
  const method = event.method as Methods
  const url = getRequestURL(event)
  const path = url.pathname

  if (path.startsWith('/api')) {
    const startTime = Date.now()
    event.node.res.on('finish', () => {
      const duration = Date.now() - startTime
      if (duration > 1000) {
        console.warn(`Slow API request: ${method} ${path} took ${duration}ms`)
      }
    })
  }

  if (!path.startsWith('/api') || method === 'GET' || path.startsWith('/api/system-settings/operation-log')) {
    return
  }

  const principal = event.context.principal as { userId?: string } | undefined

  if (!principal?.userId) {
    return
  }

  const body = await readBody(event)

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0] || event.node.req.socket.remoteAddress || ''

  const ua = getRequestHeader(event, 'user-agent') || ''

  const parser = new UAParser(ua)
  const uaResult = parser.getResult()
  const { device, os, browser } = uaResult

  try {
    await db.insert(logs).values({
      userId: principal.userId,
      ip,
      action: path,
      method,
      params: sanitizeLogData(body ?? {}), // ✅ 脱敏参数
      device: device.type ?? 'desktop',
      os: os.name ? `${os.name} ${os.version || ''}`.trim() : '未知',
      browser: browser.name ? `${browser.name} ${browser.version || ''}`.trim() : '未知',
    })
  } catch (err) {
    console.error('log insert failed:', err)
  }
})
