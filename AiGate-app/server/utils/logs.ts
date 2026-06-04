/**
 * 敏感信息关键词
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'x-api-key',
  'api_key',
]

/**
 * 脱敏对象中的敏感字段
 */
export function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()

    if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '***REDACTED***'
    }
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>)
    }
    else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * 脱敏请求头
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'cookie',
    'set-cookie',
    'proxy-authorization',
  ]

  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***'
    }
    else {
      sanitized[key] = value
    }
  }

  return sanitized
}
