import { validateApiKeyFromHeader, selectChannel, proxyToChannel, checkIpWhitelist, checkDailyLimit, checkApiKeyScopes } from '#server/utils/gateway'
import { rateLimiter } from '#server/utils/rate-limit'
import { consumeQuota } from '#server/utils/quota'
import { db } from '@/db/drizzle'
import { apiKey, apiLog } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

async function updateKeyUsage(keyId: string, cost: number) {
  await db.update(apiKey).set({
    calls: sql`${apiKey.calls} + 1`,
    cost: sql`${apiKey.cost} + ${cost}`,
    lastUsed: new Date(),
  }).where(eq(apiKey.id, keyId)).execute().catch(() => {})
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const authHeader = getRequestHeader(event, 'authorization')

  const keyRecord = await validateApiKeyFromHeader(authHeader)
  if (!keyRecord) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired API key' })
  }

  const clientIp = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || event.node.req.socket.remoteAddress
    || ''

  const method = event.method

  if (!checkIpWhitelist(keyRecord, clientIp)) {
    throw createError({ statusCode: 403, statusMessage: 'IP not in whitelist' })
  }

  if (!checkApiKeyScopes(keyRecord, method)) {
    throw createError({ statusCode: 403, statusMessage: 'API key lacks required scope for this method' })
  }

  const roleIds = (keyRecord.roleIds as string[] | null) || []
  if (roleIds.length > 0 && !(keyRecord.scopes || []).includes('admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Role-restricted API keys cannot access gateway directly' })
  }

  const dailyCheck = await checkDailyLimit(keyRecord.id, keyRecord.dailyLimit)
  if (!dailyCheck.allowed) {
    throw createError({ statusCode: 429, statusMessage: `Daily limit exceeded (${dailyCheck.used}/${dailyCheck.limit})` })
  }

  const rateCheck = rateLimiter.check(keyRecord.id, keyRecord.rateLimitPerMin || 100)
  if (!rateCheck.allowed) {
    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(keyRecord.rateLimitPerMin || 100),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
      'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
    })
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
  }

  setResponseHeaders(event, {
    'X-RateLimit-Limit': String(keyRecord.rateLimitPerMin || 100),
    'X-RateLimit-Remaining': String(rateCheck.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
  })

  const channelConfig = await selectChannel()
  if (!channelConfig) {
    throw createError({ statusCode: 503, statusMessage: 'No available upstream channel' })
  }

  const path = getRouterParam(event, 'path') || ''
  const body = method !== 'GET' ? await readBody(event).catch(() => undefined) : undefined

  const upstreamHeaders: Record<string, string> = {}
  const forwardHeaders = ['accept', 'accept-encoding']
  for (const h of forwardHeaders) {
    const val = getRequestHeader(event, h)
    if (val) upstreamHeaders[h] = val
  }

  try {
    const result = await proxyToChannel(channelConfig, path, method, upstreamHeaders, body)
    const latency = Date.now() - startTime

    let totalTokens = 0
    let cost = 0
    try {
      const parsed = JSON.parse(result.body)
      totalTokens = parsed.usage?.total_tokens || 0
    }
    catch {}

    if (keyRecord.organizationId && totalTokens > 0) {
      await consumeQuota(keyRecord.organizationId, totalTokens)
    }

    await db.insert(apiLog).values({
      userId: keyRecord.userId,
      apiKeyId: keyRecord.id,
      organizationId: keyRecord.organizationId,
      model: body?.model || 'unknown',
      provider: channelConfig.vendor,
      type: 'chat',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens,
      cost,
      latency,
      statusCode: result.status,
      status: result.status >= 400 ? 'error' : 'success',
      prompt: body?.messages ? JSON.stringify(body.messages).slice(0, 2000) : undefined,
      response: result.body.slice(0, 2000),
    }).execute().catch(() => {})

    await updateKeyUsage(keyRecord.id, cost)

    setResponseStatus(event, result.status)
    for (const [k, v] of Object.entries(result.headers)) {
      if (k !== 'transfer-encoding' && k !== 'connection') {
        setResponseHeader(event, k, v)
      }
    }

    return result.body
  }
  catch (err: any) {
    await db.insert(apiLog).values({
      userId: keyRecord.userId,
      apiKeyId: keyRecord.id,
      organizationId: keyRecord.organizationId,
      model: body?.model || 'unknown',
      provider: channelConfig.vendor,
      latency: Date.now() - startTime,
      statusCode: 502,
      status: 'error',
      errorMessage: err.message,
    }).execute().catch(() => {})

    await updateKeyUsage(keyRecord.id, 0)

    throw createError({ statusCode: 502, statusMessage: 'Upstream error' })
  }
})
