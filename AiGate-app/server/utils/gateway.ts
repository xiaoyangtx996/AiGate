import { and, asc, count, eq, gte } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey, apiLog, channel } from '@/db/schema'

interface ChannelCandidate {
  id: string
  endpoint: string
  vendor: string
  priority: number
  status: string
  health: string
}

const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/
const trailingSlashPattern = /\/$/

export async function selectChannel(_model?: string): Promise<ChannelCandidate | null> {
  const conditions = [eq(channel.status, 'enabled')]
  const channels = await db.select().from(channel).where(and(...conditions)).orderBy(asc(channel.priority))

  const healthy = channels.filter(c => c.health !== 'down')
  if (healthy.length === 0)
    return null
  return healthy[0] as ChannelCandidate
}

export async function validateApiKeyFromHeader(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer '))
    return null
  const key = authHeader.slice(7)
  const [found] = await db.select().from(apiKey).where(eq(apiKey.key, key))
  if (!found || found.status !== 'active')
    return null
  if (found.expiresAt && new Date(found.expiresAt) < new Date())
    return null
  return found
}

export function checkIpWhitelist(keyRecord: any, clientIp: string): boolean {
  const whitelist = keyRecord.ipWhitelist as string[] | null
  if (!whitelist || whitelist.length === 0)
    return true
  return whitelist.some((entry: string) => {
    if (entry.includes('/')) {
      return matchCidr(clientIp, entry)
    }
    return clientIp === entry
  })
}

function matchCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/')
  if (parts.length !== 2) {
    throw new Error('Invalid CIDR format')
  }

  const range = parts[0]
  const bitsStr = parts[1]
  if (!range || !bitsStr) {
    throw new Error('Invalid CIDR format')
  }
  const bits = Number.parseInt(bitsStr, 10)

  // ✅ 验证 bits 范围 (0-32)
  if (Number.isNaN(bits) || bits < 0 || bits > 32) {
    throw new Error('Invalid CIDR prefix length')
  }

  // ✅ 验证 IP 格式
  if (!ipv4Pattern.test(ip) || !ipv4Pattern.test(range)) {
    throw new Error('Invalid IP address format')
  }

  // 验证每个 octet 在 0-255 范围内
  const validateOctets = (addr: string) => {
    return addr.split('.').every((octet) => {
      const num = Number.parseInt(octet, 10)
      return !Number.isNaN(num) && num >= 0 && num <= 255
    })
  }

  if (!validateOctets(ip) || !validateOctets(range)) {
    throw new Error('Invalid IP octet value')
  }

  const mask = bits === 0 ? 0 : ~(2 ** (32 - bits) - 1) >>> 0
  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(range)
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number {
  const octets = ip.split('.')
  if (octets.length !== 4) {
    throw new Error('Invalid IP address format')
  }

  return octets.reduce((acc, octet) => {
    const num = Number.parseInt(octet, 10)
    if (Number.isNaN(num) || num < 0 || num > 255) {
      throw new Error('Invalid IP octet')
    }
    return (acc << 8) + num
  }, 0) >>> 0
}

export async function checkDailyLimit(keyId: string, dailyLimit: number | null): Promise<{ allowed: boolean, used: number, limit: number | null }> {
  if (!dailyLimit)
    return { allowed: true, used: 0, limit: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [result] = await db.select({ count: count() }).from(apiLog).where(and(
    eq(apiLog.apiKeyId, keyId),
    gte(apiLog.createdAt, today),
  ))
  const used = result?.count ?? 0
  return { allowed: used < dailyLimit, used, limit: dailyLimit }
}

export async function proxyToChannel(channelConfig: ChannelCandidate, path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${channelConfig.endpoint.replace(trailingSlashPattern, '')}/${path}`
  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }
  const startTime = Date.now()
  const response = await fetch(url, fetchOptions)
  const latency = Date.now() - startTime
  const responseBody = await response.text()
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body: responseBody, latency }
}

export async function proxyToChannelStream(channelConfig: ChannelCandidate, path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${channelConfig.endpoint.replace(trailingSlashPattern, '')}/${path}`
  const fetchOptions: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', ...headers },
  }
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }
  const response = await fetch(url, fetchOptions)
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '')
    throw createError({ statusCode: response.status || 502, statusMessage: text || 'Upstream stream error' })
  }
  return response
}

export function checkApiKeyScopes(keyRecord: { scopes?: string[] | null, roleIds?: string[] | null }, method: string): boolean {
  const scopes = keyRecord.scopes || ['read', 'write']
  if (method === 'GET' || method === 'HEAD')
    return scopes.includes('read')
  return scopes.includes('write')
}
