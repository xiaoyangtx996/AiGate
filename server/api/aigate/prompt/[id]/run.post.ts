import { and, eq } from 'drizzle-orm'
import { proxyToChannel, proxyToChannelStream, selectChannel } from '#server/utils/gateway'
import { consumeQuota } from '#server/utils/quota'
import { db } from '@/db/drizzle'
import { apiLog, prompt } from '@/db/schema'

interface PromptVariable {
  name: string
  required?: boolean
  defaultValue?: unknown
}

const PROMPT_VAR_RE = /\{\{\s*([a-z_][\w-]*)\s*\}\}/gi

function normalizeValues(input: unknown) {
  return typeof input === 'object' && input !== null ? input as Record<string, unknown> : {}
}

function normalizePromptVariables(value: unknown): PromptVariable[] {
  if (!Array.isArray(value))
    return []
  return value
    .map((item) => {
      if (typeof item === 'string')
        return { name: item }
      if (typeof item === 'object' && item !== null && typeof (item as { name?: unknown }).name === 'string')
        return item as PromptVariable
      return null
    })
    .filter((item): item is PromptVariable => Boolean(item))
}

function renderPrompt(content: string, values: Record<string, unknown>) {
  return content.replace(PROMPT_VAR_RE, (_match, name: string) => {
    const value = values[name]
    return value === undefined || value === null ? '' : String(value)
  })
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, organizationId?: string | null, userId?: string }
      | undefined
    if (!principal?.userId)
      return responseError(null, 'Unauthorized', { statusCode: 401 })
    if (!principal.isAdmin && !principal.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(prompt.id, id!), eq(prompt.organizationId, principal.organizationId))
      : eq(prompt.id, id!)
    const [row] = await db.select().from(prompt).where(where)
    if (!row)
      return responseError(null, 'Prompt not found', { statusCode: 404 })

    const body = await readBody(event)
    const model = String(body?.model || 'gpt-4o')
    const values = normalizeValues(body?.values || body?.variables)
    const finalValues = { ...values }
    const missing: string[] = []
    for (const variable of normalizePromptVariables(row.variables)) {
      if (finalValues[variable.name] === undefined && variable.defaultValue !== undefined)
        finalValues[variable.name] = variable.defaultValue
      if (variable.required && (finalValues[variable.name] === undefined || finalValues[variable.name] === ''))
        missing.push(variable.name)
    }
    if (missing.length > 0)
      return responseError({ missing }, 'Missing required prompt variables', { statusCode: 400 })

    const rendered = renderPrompt(row.content, finalValues)
    const channelConfig = await selectChannel(model, principal.organizationId)
    if (!channelConfig)
      return responseError(null, 'No available channel', { statusCode: 503 })

    const startTime = Date.now()
    if (body?.stream) {
      setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })
      const encoder = new TextEncoder()
      return new ReadableStream({
        async start(controller) {
          const send = (type: string, payload: Record<string, unknown> = {}) =>
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`))
          try {
            send('start', { rendered })
            const upstream = await proxyToChannelStream(
              channelConfig,
              'v1/chat/completions',
              'POST',
              { 'Content-Type': 'application/json' },
              {
                model,
                messages: [{ role: 'user', content: rendered }],
                temperature: Number(body?.temperature ?? 0.3),
                stream: true,
              },
            )
            const reader = upstream.body!.getReader()
            const decoder = new TextDecoder()
            let message = ''
            let usage: { total_tokens?: number } | null = null
            while (true) {
              const { done, value } = await reader.read()
              if (done)
                break
              const chunk = decoder.decode(value, { stream: true })
              for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: '))
                  continue
                const payload = line.slice(6).trim()
                if (!payload || payload === '[DONE]')
                  continue
                try {
                  const parsed = JSON.parse(payload)
                  const delta = parsed.choices?.[0]?.delta?.content || ''
                  if (delta) {
                    message += delta
                    send('delta', { content: delta })
                  }
                  if (parsed.usage?.total_tokens)
                    usage = parsed.usage
                }
                catch {}
              }
            }
            const latency = Date.now() - startTime
            const totalTokens = usage?.total_tokens || 0
            const quotaOrganizationId = principal.organizationId || row.organizationId
            await db.insert(apiLog).values({
              userId: principal.userId,
              organizationId: row.organizationId,
              model,
              provider: channelConfig.vendor,
              type: 'prompt_sandbox',
              totalTokens,
              latency,
              statusCode: upstream.status,
              status: upstream.status >= 400 ? 'error' : 'success',
              prompt: rendered.slice(0, 2000),
              response: message.slice(0, 2000),
            }).execute().catch(() => {})
            if (quotaOrganizationId && totalTokens > 0)
              await Promise.resolve(consumeQuota(quotaOrganizationId, totalTokens)).catch(() => {})
            send('done', { message, usage, latency, model, rendered })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
          catch (err) {
            send('error', { message: err instanceof Error ? err.message : 'Sandbox stream failed' })
          }
          finally {
            controller.close()
          }
        },
      })
    }

    const result = await proxyToChannel(
      channelConfig,
      'v1/chat/completions',
      'POST',
      { 'Content-Type': 'application/json' },
      {
        model,
        messages: [{ role: 'user', content: rendered }],
        temperature: Number(body?.temperature ?? 0.3),
        stream: false,
      },
    )
    const latency = Date.now() - startTime
    let message = result.body
    let usage: { total_tokens?: number } | null = null
    try {
      const parsed = JSON.parse(result.body)
      message = parsed.choices?.[0]?.message?.content || result.body
      usage = parsed.usage || null
    }
    catch {}

    const totalTokens = usage?.total_tokens || 0
    const quotaOrganizationId = principal.organizationId || row.organizationId
    await db.insert(apiLog).values({
      userId: principal.userId,
      organizationId: row.organizationId,
      model,
      provider: channelConfig.vendor,
      type: 'prompt_sandbox',
      totalTokens,
      latency,
      statusCode: result.status,
      status: result.status >= 400 ? 'error' : 'success',
      prompt: rendered.slice(0, 2000),
      response: message.slice(0, 2000),
    }).execute().catch(() => {})
    if (quotaOrganizationId && totalTokens > 0)
      await Promise.resolve(consumeQuota(quotaOrganizationId, totalTokens)).catch(() => {})

    return responseSuccess({ rendered, message, usage, latency, model })
  }
  catch (err) {
    return responseError(err)
  }
})
