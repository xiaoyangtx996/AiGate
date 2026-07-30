import { randomUUID } from 'node:crypto'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import {
  checkApiKeyScopes,
  checkDailyLimit,
  checkIpWhitelist,
  getClientIpFromGatewayEvent,
  proxyToChannel,
  proxyToChannelStream,
  selectChannel,
  validateApiKeyFromHeader,
} from '#server/utils/gateway'
import { estimateTokensFromText, mergeStreamUsage, parseNonStreamUsage, parseStreamChunkUsage, type TokenUsage } from '#server/utils/gateway-usage'
import { consumeQuota } from '#server/utils/quota'
import { rateLimiter } from '#server/utils/rate-limit'
import { getSetting } from '#server/utils/system-settings'
import { db } from '@/db/drizzle'
import { aiModel, apiKey, apiLog } from '@/db/schema'

async function updateKeyUsage(keyId: string, cost: number) {
  await db
    .update(apiKey)
    .set({
      calls: sql`${apiKey.calls} + 1`,
      cost: sql`${apiKey.cost} + ${cost}`,
      lastUsed: new Date(),
    })
    .where(eq(apiKey.id, keyId))
    .execute()
    .catch(() => {})
}

const DEFAULT_RATE_LIMIT_PER_MIN = 100
const sensitiveLogKeys = ['authorization', 'apiKey', 'api_key', 'password', 'secret', 'token', 'x-api-key']

function roundCost(value: number) {
  return Number(value.toFixed(8))
}

async function calculateGatewayCost(model: string | undefined, usage: TokenUsage, channelId?: string) {
  if (!model || usage.totalTokens <= 0 || usage.tokensEstimated)
    return 0

  const conditions = [
    eq(aiModel.name, model),
    eq(aiModel.enabled, true),
    eq(aiModel.status, 'available'),
  ]
  if (channelId) {
    conditions.push(or(eq(aiModel.sourceChannelId, channelId), isNull(aiModel.sourceChannelId))!)
  }

  const [modelRow] = await db
    .select({
      inputPrice: aiModel.inputPrice,
      outputPrice: aiModel.outputPrice,
    })
    .from(aiModel)
    .where(and(...conditions))
    .limit(1)

  if (!modelRow)
    return 0

  const inputPrice = Number(modelRow.inputPrice || 0)
  const outputPrice = Number(modelRow.outputPrice || 0)
  return roundCost((usage.inputTokens * inputPrice + usage.outputTokens * outputPrice) / 1000)
}

function redactLogPayload(value: unknown): unknown {
  if (value === null || value === undefined)
    return value
  if (Array.isArray(value))
    return value.map(item => redactLogPayload(item))
  if (typeof value !== 'object')
    return value

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase().replace(/[-_\s]/g, '')
    result[key] = sensitiveLogKeys.some(sensitive => normalized.includes(sensitive.toLowerCase().replace(/[-_\s]/g, '')))
      ? '***REDACTED***'
      : redactLogPayload(item)
  }
  return result
}

function stringifyDebugPayload(value: unknown) {
  if (value === undefined)
    return undefined
  if (typeof value === 'string') {
    try {
      return JSON.stringify(redactLogPayload(JSON.parse(value))).slice(0, 2000)
    }
    catch {}
    return value.slice(0, 2000)
  }
  return JSON.stringify(redactLogPayload(value)).slice(0, 2000)
}

function isOpenAiCompatibleVendor(vendor: string) {
  const v = vendor.toLowerCase()
  return !v.includes('anthropic') && !v.includes('claude')
}

function appendStreamDeltaText(line: string, collectedOutput: string) {
  if (!line.startsWith('data: '))
    return collectedOutput
  const payload = line.slice(6).trim()
  if (!payload || payload === '[DONE]')
    return collectedOutput
  try {
    const parsed = JSON.parse(payload)
    const delta = parsed.choices?.[0]?.delta?.content || parsed.delta?.text || ''
    return collectedOutput + delta
  }
  catch {
    return collectedOutput
  }
}

async function persistGatewaySuccessLog(options: {
  keyRecord: Awaited<ReturnType<typeof validateApiKeyFromHeader>> & object
  channelConfig: { id?: string, vendor: string, modelName?: string }
  body: any
  usage: TokenUsage
  latency: number
  statusCode: number
  traceId: string
  gatewayDebug: boolean
  responseBody?: string
}) {
  const { keyRecord, channelConfig, body, usage, latency, statusCode, traceId, gatewayDebug, responseBody } = options
  const model = channelConfig.modelName || body?.model || 'unknown'
  const cost = await calculateGatewayCost(model, usage, channelConfig.id)

  if (keyRecord.organizationId && usage.totalTokens > 0) {
    await consumeQuota(keyRecord.organizationId, usage.totalTokens, cost)
  }

  await db
    .insert(apiLog)
    .values({
      userId: keyRecord.userId,
      apiKeyId: keyRecord.id,
      organizationId: keyRecord.organizationId,
      model,
      provider: channelConfig.vendor,
      type: 'chat',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      tokensEstimated: usage.tokensEstimated ?? false,
      cost,
      latency,
      statusCode,
      status: statusCode >= 400 ? 'error' : 'success',
      prompt: gatewayDebug ? stringifyDebugPayload(body) : undefined,
      response: gatewayDebug ? stringifyDebugPayload(responseBody) : undefined,
      traceId,
    })
    .execute()
    .catch(() => {})

  await updateKeyUsage(keyRecord.id, cost)
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const authHeader = getRequestHeader(event, 'authorization')

  const keyRecord = await validateApiKeyFromHeader(authHeader)
  if (!keyRecord) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired API key' })
  }

  const traceId = getRequestHeader(event, 'x-trace-id') || randomUUID()
  setResponseHeader(event, 'X-Trace-Id', traceId)

  const clientIp = getClientIpFromGatewayEvent(event)

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
    throw createError({
      statusCode: 429,
      statusMessage: `Daily limit exceeded (${dailyCheck.used}/${dailyCheck.limit})`,
    })
  }

  const rateCheck = await rateLimiter.check(keyRecord.id, DEFAULT_RATE_LIMIT_PER_MIN)
  if (!rateCheck.allowed) {
    setResponseHeaders(event, {
      'X-RateLimit-Limit': String(DEFAULT_RATE_LIMIT_PER_MIN),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
      'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
    })
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
  }

  setResponseHeaders(event, {
    'X-RateLimit-Limit': String(DEFAULT_RATE_LIMIT_PER_MIN),
    'X-RateLimit-Remaining': String(rateCheck.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
  })

  const path = getRouterParam(event, 'path') || ''
  const body = method !== 'GET' ? await readBody(event).catch(() => undefined) : undefined
  const requestedModel = typeof body?.model === 'string' ? body.model : undefined
  const gatewayDebug = await getSetting<boolean>('advanced.gatewayDebug', keyRecord.organizationId)

  const channelConfig = await selectChannel(requestedModel, keyRecord.organizationId)
  if (!channelConfig) {
    throw createError({
      statusCode: requestedModel ? 404 : 503,
      statusMessage: requestedModel ? '模型未注册' : 'No available upstream channel',
    })
  }

  const upstreamHeaders: Record<string, string> = {}
  const forwardHeaders = ['accept', 'accept-encoding']
  for (const h of forwardHeaders) {
    const val = getRequestHeader(event, h)
    if (val)
      upstreamHeaders[h] = val
  }

  try {
    if (body?.stream === true) {
      setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })

      const upstreamBody = { ...body, stream: true }
      if (isOpenAiCompatibleVendor(channelConfig.vendor) && !upstreamBody.stream_options) {
        upstreamBody.stream_options = { include_usage: true }
      }

      const upstream = await proxyToChannelStream(
        channelConfig,
        path,
        method,
        upstreamHeaders,
        upstreamBody,
      )

      const reader = upstream.body!.getReader()
      const decoder = new TextDecoder()
      let usageAcc: TokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, tokensEstimated: false }
      let collectedOutput = ''
      let lineBuffer = ''

      return new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done)
                break
              controller.enqueue(value)
              const chunkText = decoder.decode(value, { stream: true })
              lineBuffer += chunkText
              const lines = lineBuffer.split('\n')
              lineBuffer = lines.pop() ?? ''
              for (const line of lines) {
                const parsedUsage = parseStreamChunkUsage(channelConfig.vendor, line)
                if (parsedUsage)
                  usageAcc = mergeStreamUsage(usageAcc, parsedUsage)
                collectedOutput = appendStreamDeltaText(line, collectedOutput)
              }
            }
            if (lineBuffer) {
              const parsedUsage = parseStreamChunkUsage(channelConfig.vendor, lineBuffer)
              if (parsedUsage)
                usageAcc = mergeStreamUsage(usageAcc, parsedUsage)
              collectedOutput = appendStreamDeltaText(lineBuffer, collectedOutput)
            }
          }
          finally {
            let finalUsage = usageAcc
            if (finalUsage.totalTokens <= 0) {
              finalUsage = estimateTokensFromText(
                JSON.stringify(body?.messages ?? body ?? ''),
                collectedOutput,
              )
            }
            await persistGatewaySuccessLog({
              keyRecord,
              channelConfig,
              body,
              usage: finalUsage,
              latency: Date.now() - startTime,
              statusCode: upstream.status,
              traceId,
              gatewayDebug,
            })
            controller.close()
          }
        },
      })
    }

    const result = await proxyToChannel(channelConfig, path, method, upstreamHeaders, body)
    const latency = Date.now() - startTime
    const promptText = JSON.stringify(body?.messages ?? body ?? '')
    const usage = parseNonStreamUsage(channelConfig.vendor, result.body, promptText)

    await persistGatewaySuccessLog({
      keyRecord,
      channelConfig,
      body,
      usage,
      latency,
      statusCode: result.status,
      traceId,
      gatewayDebug,
      responseBody: result.body,
    })

    setResponseStatus(event, result.status)
    for (const [k, v] of Object.entries(result.headers)) {
      if (k !== 'transfer-encoding' && k !== 'connection') {
        setResponseHeader(event, k, v)
      }
    }

    return result.body
  }
  catch (err: any) {
    await db
      .insert(apiLog)
      .values({
        userId: keyRecord.userId,
        apiKeyId: keyRecord.id,
        organizationId: keyRecord.organizationId,
        model: body?.model || 'unknown',
        provider: channelConfig.vendor,
        latency: Date.now() - startTime,
        statusCode: 502,
        status: 'error',
        errorMessage: err.message,
        prompt: gatewayDebug ? stringifyDebugPayload(body) : undefined,
        traceId,
      })
      .execute()
      .catch(() => {})

    await updateKeyUsage(keyRecord.id, 0)

    throw createError({ statusCode: 502, statusMessage: 'Upstream error' })
  }
})
