import type { H3Event } from 'h3'
import { UAParser } from 'ua-parser-js'
import { db } from '@/db/drizzle'
import { logs } from '@/db/schema'

const SENSITIVE_KEYS = [
  'apikey',
  'api_key',
  'authconfig',
  'authorization',
  'cookie',
  'key',
  'password',
  'secret',
  'token',
  'x-api-key',
]
const normalizedKeyPattern = /[-_\s]/g

function readHeader(event: H3Event, key: string) {
  const headers = event.node?.req?.headers as Record<string, string | string[] | undefined> | undefined
  const value = headers?.[key.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

interface AuditTarget {
  type: string
  id?: string | null
}

function redact(value: unknown): unknown {
  if (value === null || value === undefined)
    return value
  if (value instanceof Date)
    return value.toISOString()
  if (Array.isArray(value))
    return value.map(item => redact(item))
  if (typeof value !== 'object')
    return value

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(normalizedKeyPattern, '')
    result[key] = SENSITIVE_KEYS.some(sensitive => normalized.includes(sensitive.replace(normalizedKeyPattern, '')))
      ? '***REDACTED***'
      : redact(item)
  }
  return result
}

export async function auditLog(
  event: H3Event,
  action: string,
  target: AuditTarget,
  before?: unknown,
  after?: unknown,
) {
  const principal = event.context.principal as { userId?: string } | undefined
  if (!principal?.userId)
    return

  try {
    const ip = readHeader(event, 'x-forwarded-for')?.split(',')[0] || event.node?.req?.socket?.remoteAddress || ''
    const ua = readHeader(event, 'user-agent') || ''
    const uaResult = new UAParser(ua).getResult()

    await db.insert(logs).values({
      userId: principal.userId,
      ip,
      action,
      method: event.method as Methods,
      targetType: target.type,
      targetId: target.id ?? null,
      before: redact(before),
      after: redact(after),
      params: null,
      device: uaResult.device.type ?? 'desktop',
      os: uaResult.os.name ? `${uaResult.os.name} ${uaResult.os.version || ''}`.trim() : 'unknown',
      browser: uaResult.browser.name ? `${uaResult.browser.name} ${uaResult.browser.version || ''}`.trim() : 'unknown',
    })
  }
  catch (err) {
    if (process.env.NODE_ENV !== 'test')
      console.error('audit log insert failed:', err)
  }
}
