import { and, asc, count, eq, gte, isNull, lte, or } from 'drizzle-orm'
import { decryptCredentialIfNeeded } from '#server/utils/credential-crypto'
import { buildUpstreamUrl, updateCredentialFromStatus } from '#server/utils/gateway-channel'
import { redisIncrWithExpire } from '#server/utils/redis'
import { db } from '@/db/drizzle'
import { aiModel, apiKey, apiLog, channel, channelCredential, modelCombo, modelComboItem } from '@/db/schema'

export interface ChannelCandidate {
  id: string
  endpoint: string
  vendor: string
  priority: number
  status: string
  health: string
  credentialId?: string
  credentialName?: string
  apiKey?: string
  modelName?: string
  fallbacks?: ChannelCandidate[]
}

const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/
const credentialCursor = new Map<string, number>()

async function getCredentialCursor(channelId: string, usableCount: number) {
  const redisResult = await redisIncrWithExpire(`gateway:credential-cursor:${channelId}`, 24 * 60 * 60)
  if (redisResult)
    return (redisResult.count - 1) % usableCount

  const start = credentialCursor.get(channelId) ?? 0
  credentialCursor.set(channelId, (start + 1) % usableCount)
  return start
}

function normalizeIp(ip: string | undefined | null) {
  if (!ip)
    return ''
  return ip.replace(/^::ffff:/, '').trim()
}

function getTrustedProxyCidrs() {
  return (process.env.TRUSTED_PROXY_CIDRS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function isTrustedProxy(ip: string) {
  const cidrs = getTrustedProxyCidrs()
  if (cidrs.length === 0)
    return false
  return cidrs.some(cidr => matchCidr(ip, cidr))
}

export function getClientIpFromGatewayEvent(event: { node: { req: { socket: { remoteAddress?: string | null } } } }) {
  const directIp = normalizeIp(event.node.req.socket.remoteAddress)
  if (!directIp || !isTrustedProxy(directIp))
    return directIp

  const forwardedFor = getRequestHeader(event as never, 'x-forwarded-for')
  return normalizeIp(forwardedFor?.split(',')[0]) || directIp
}

function isRetryableStatus(status: number) {
  return status === 401 || status === 403 || status === 429 || status >= 500
}

function toCandidate(
  ch: typeof channel.$inferSelect,
  credential?: typeof channelCredential.$inferSelect,
  modelName?: string,
): ChannelCandidate {
  return {
    id: ch.id,
    endpoint: ch.endpoint,
    vendor: ch.vendor,
    priority: ch.priority,
    status: ch.status,
    health: ch.health,
    credentialId: credential?.id,
    credentialName: credential?.name,
    apiKey: credential?.apiKey ? decryptCredentialIfNeeded(credential.apiKey) : undefined,
    modelName,
  }
}

function isExpiredCooldown(credential: typeof channelCredential.$inferSelect) {
  return credential.status === 'exhausted' && !!credential.cooldownUntil && credential.cooldownUntil <= new Date()
}

async function buildChannelCandidates(ch: typeof channel.$inferSelect, modelName?: string) {
  const credentials = await db
    .select()
    .from(channelCredential)
    .where(
      and(
        eq(channelCredential.channelId, ch.id),
        or(eq(channelCredential.status, 'active'), lte(channelCredential.cooldownUntil, new Date())),
      ),
    )
    .orderBy(asc(channelCredential.sort), asc(channelCredential.createdAt))

  const usable = credentials.filter(item => item.status === 'active' || isExpiredCooldown(item))
  if (usable.length === 0)
    return []

  const start = await getCredentialCursor(ch.id, usable.length)
  const ordered = usable.slice(start).concat(usable.slice(0, start))

  for (const credential of ordered) {
    if (isExpiredCooldown(credential)) {
      await db
        .update(channelCredential)
        .set({ status: 'active', cooldownUntil: null, lastError: null })
        .where(eq(channelCredential.id, credential.id))
    }
  }

  return ordered.map(credential => toCandidate(ch, credential, modelName))
}

async function selectEnabledChannels() {
  const channels = await db
    .select()
    .from(channel)
    .where(and(eq(channel.status, 'enabled'), eq(channel.enabled, true)))
    .orderBy(asc(channel.priority))
  return channels.filter(c => c.health !== 'down')
}

async function selectComboCandidates(model: string, organizationId?: string | null) {
  const [combo] = await db
    .select()
    .from(modelCombo)
    .where(
      and(
        eq(modelCombo.name, model),
        eq(modelCombo.enabled, true),
        organizationId ? eq(modelCombo.organizationId, organizationId) : isNull(modelCombo.organizationId),
      ),
    )
    .limit(1)
  if (!combo)
    return []

  const items = await db
    .select()
    .from(modelComboItem)
    .where(eq(modelComboItem.comboId, combo.id))
    .orderBy(asc(modelComboItem.sort), asc(modelComboItem.createdAt))

  const candidates: ChannelCandidate[] = []
  for (const item of items) {
    const [ch] = await db
      .select()
      .from(channel)
      .where(and(eq(channel.id, item.channelId), eq(channel.status, 'enabled'), eq(channel.enabled, true)))
      .limit(1)
    if (!ch || ch.health === 'down')
      continue
    candidates.push(...(await buildChannelCandidates(ch, item.modelName)))
  }
  return candidates
}

async function selectModelCandidates(model: string) {
  const models = await db
    .select()
    .from(aiModel)
    .where(and(eq(aiModel.name, model), eq(aiModel.enabled, true), eq(aiModel.status, 'available')))
  if (models.length === 0)
    return []

  const candidates: ChannelCandidate[] = []
  const sourceChannelIds = models.map(item => item.sourceChannelId).filter((item): item is string => Boolean(item))
  if (sourceChannelIds.length === 0) {
    for (const ch of await selectEnabledChannels()) {
      candidates.push(...(await buildChannelCandidates(ch, model)))
    }
    return candidates
  }

  const channels = await selectEnabledChannels()
  for (const ch of channels.filter(item => sourceChannelIds.includes(item.id))) {
    candidates.push(...(await buildChannelCandidates(ch, model)))
  }
  return candidates
}

export async function selectChannel(model?: string, organizationId?: string | null): Promise<ChannelCandidate | null> {
  const candidates = model
    ? [...(await selectComboCandidates(model, organizationId)), ...(await selectModelCandidates(model))]
    : (
        await Promise.all((await selectEnabledChannels()).map(ch => buildChannelCandidates(ch)))
      ).flat()

  if (candidates.length === 0)
    return null
  const [first, ...fallbacks] = candidates
  return { ...first!, fallbacks }
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
  const normalizedClientIp = normalizeIp(clientIp)
  return whitelist.some((entry: string) => {
    if (entry.includes('/')) {
      return matchCidr(normalizedClientIp, entry)
    }
    return normalizedClientIp === normalizeIp(entry)
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

  return (
    octets.reduce((acc, octet) => {
      const num = Number.parseInt(octet, 10)
      if (Number.isNaN(num) || num < 0 || num > 255) {
        throw new Error('Invalid IP octet')
      }
      return (acc << 8) + num
    }, 0) >>> 0
  )
}

export async function checkDailyLimit(
  keyId: string,
  dailyLimit: number | null,
): Promise<{ allowed: boolean, used: number, limit: number | null }> {
  if (!dailyLimit)
    return { allowed: true, used: 0, limit: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [result] = await db
    .select({ count: count() })
    .from(apiLog)
    .where(and(eq(apiLog.apiKeyId, keyId), gte(apiLog.createdAt, today)))
  const used = result?.count ?? 0
  return { allowed: used < dailyLimit, used, limit: dailyLimit }
}

export async function proxyToChannel(
  channelConfig: ChannelCandidate,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
) {
  const candidates = [channelConfig, ...(channelConfig.fallbacks || [])]
  let lastResult: Awaited<ReturnType<typeof proxyToSingleChannel>> | null = null
  let lastError: unknown

  for (const candidate of candidates) {
    try {
      const result = await proxyToSingleChannel(candidate, path, method, headers, body)
      await updateCredentialFromStatus(candidate.credentialId, result.status, result.body.slice(0, 500))
      lastResult = result
      if (!isRetryableStatus(result.status))
        return result
    }
    catch (err) {
      lastError = err
    }
  }

  if (lastResult)
    return lastResult
  throw lastError instanceof Error ? lastError : new Error('Upstream error')
}

async function proxyToSingleChannel(
  channelConfig: ChannelCandidate,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
) {
  const url = buildUpstreamUrl(channelConfig.endpoint, path)
  const outboundHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers }
  delete outboundHeaders.authorization
  delete outboundHeaders.Authorization
  if (channelConfig.apiKey) {
    outboundHeaders.Authorization = `Bearer ${channelConfig.apiKey}`
  }
  const fetchOptions: RequestInit = { method, headers: outboundHeaders }
  const upstreamBody = body && channelConfig.modelName ? { ...body, model: channelConfig.modelName } : body
  if (upstreamBody && method !== 'GET') {
    fetchOptions.body = JSON.stringify(upstreamBody)
  }
  const startTime = Date.now()
  const response = await fetch(url, fetchOptions)
  const latency = Date.now() - startTime
  const responseBody = await response.text()
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: responseBody,
    latency,
  }
}

export async function proxyToChannelStream(
  channelConfig: ChannelCandidate,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
) {
  const candidates = [channelConfig, ...(channelConfig.fallbacks || [])]
  let lastError: unknown

  for (const candidate of candidates) {
    try {
      const response = await proxyToSingleChannelStream(candidate, path, method, headers, body)
      await updateCredentialFromStatus(candidate.credentialId, response.status)
      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '')
        if (isRetryableStatus(response.status)) {
          lastError = createError({ statusCode: response.status || 502, statusMessage: text || 'Upstream stream error' })
          continue
        }
        throw createError({ statusCode: response.status || 502, statusMessage: text || 'Upstream stream error' })
      }
      return response
    }
    catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error ? lastError : createError({ statusCode: 502, statusMessage: 'Upstream stream error' })
}

async function proxyToSingleChannelStream(
  channelConfig: ChannelCandidate,
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: any,
) {
  const url = buildUpstreamUrl(channelConfig.endpoint, path)
  const outboundHeaders: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', ...headers }
  delete outboundHeaders.authorization
  delete outboundHeaders.Authorization
  if (channelConfig.apiKey) {
    outboundHeaders.Authorization = `Bearer ${channelConfig.apiKey}`
  }
  const fetchOptions: RequestInit = { method, headers: outboundHeaders }
  const upstreamBody = body && channelConfig.modelName ? { ...body, model: channelConfig.modelName } : body
  if (upstreamBody && method !== 'GET') {
    fetchOptions.body = JSON.stringify(upstreamBody)
  }
  const response = await fetch(url, fetchOptions)
  return response
}

export function checkApiKeyScopes(
  keyRecord: { scopes?: string[] | null, roleIds?: string[] | null },
  method: string,
): boolean {
  const scopes = keyRecord.scopes || ['read', 'write']
  if (method === 'GET' || method === 'HEAD')
    return scopes.includes('read')
  return scopes.includes('write')
}
