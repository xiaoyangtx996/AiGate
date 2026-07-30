import { and, asc, eq, sql } from 'drizzle-orm'
import {
  BOT_TOOL_DEFINITIONS,
  buildBotSystemPrompt,
  parseBotToolArguments,
  pickBotTool,
  runBotTool,
} from '#server/utils/aigate-bot'
import { proxyToChannel, proxyToChannelStream, selectChannel } from '#server/utils/gateway'
import { consumeQuota } from '#server/utils/quota'
import { getSetting } from '#server/utils/system-settings'
import { db } from '@/db/drizzle'
import { aiModel, apiLog, conversation, conversationMessage } from '@/db/schema'

const MAX_BOT_TOOL_CALLS = 8

interface BotToolStep {
  name: string
  input?: unknown
  result?: unknown
  status?: 'called' | 'failed'
  message?: string
  latency?: number
}

function shouldShowRestrictedNotice(result: unknown) {
  if (!result || typeof result !== 'object')
    return false
  const value = result as { restricted?: boolean, visibleCount?: number, globalCount?: number }
  if (!value.restricted)
    return false
  if (typeof value.visibleCount === 'number' && typeof value.globalCount === 'number')
    return value.visibleCount === 0 && value.globalCount > 0
  return false
}

function summarizeToolResult(tool: string, result: any) {
  const restricted = shouldShowRestrictedNotice(result) ? '\n\nRestricted by permissions: some data is not visible.' : ''
  if (tool === 'query_api_keys')
    return `API keys: total ${result.total}, active ${result.active}, disabled ${result.disabled || 0}, revoked ${result.revoked}, abnormal ${result.abnormal || 0}, expiring soon ${result.expiringSoon}.${restricted}`
  if (tool === 'query_channels_health') {
    return result.error === 'admin_only'
      ? 'Channel health is available to administrators only.'
      : `Channels: total ${result.total}, healthy ${result.healthy}.${restricted}`
  }
  if (tool === 'query_alerts')
    return `Alerts: open ${result.open ?? result.unread ?? 0}. By type: ${JSON.stringify(result.byType)}.${restricted}`
  if (tool === 'query_quota')
    return `Quota usage:\n${(result.rows || []).map((row: any) => `- ${row.name}: ${row.usedPercentage}% (${row.estimatedDaysRemaining ?? 'n/a'} days remaining)`).join('\n') || '- no data'}${restricted}`
  if (tool === 'query_agents_stats')
    return `Agents: total ${result.total}, active ${result.active}.\n${(result.rows || []).map((row: any) => `- ${row.name}: ${row.conversations} conversations, ${row.errors} errors`).join('\n')}${restricted}`
  return `Token usage:\n${(result.rows || []).map((row: any) => `- ${row.organizationId} / ${row.userId} / ${row.model}: ${row.tokens} tokens`).join('\n') || '- no data'}${restricted}`
}

async function resolveBotModelId(organizationId?: string | null) {
  try {
    const configured = await getSetting<string>('bot.modelId', organizationId)
    if (configured?.trim())
      return configured.trim()
  }
  catch {}

  const [firstModel] = await db
    .select()
    .from(aiModel)
    .where(and(eq(aiModel.type, 'chat'), eq(aiModel.enabled, true), eq(aiModel.status, 'available')))
    .limit(1)
    .catch(() => [])
  return firstModel?.name || 'gpt-4o-mini'
}

function extractAssistantMessage(body: string) {
  const parsed = JSON.parse(body)
  return {
    message: parsed.choices?.[0]?.message,
    usage: parsed.usage,
  }
}

function getUsageTotal(usage: unknown) {
  if (!usage || typeof usage !== 'object')
    return 0
  const value = (usage as { total_tokens?: unknown }).total_tokens
  return typeof value === 'number' ? value : 0
}

function emitReplyDeltas(content: string, onDelta: (content: string) => void) {
  if (!content)
    return
  const chunkSize = 24
  for (let index = 0; index < content.length; index += chunkSize)
    onDelta(content.slice(index, index + chunkSize))
}

interface StreamedAssistantTurn {
  message: {
    role: 'assistant'
    content?: string | null
    tool_calls?: Array<{
      id: string
      type: 'function'
      function: { name: string, arguments: string }
    }>
  }
  totalTokens: number
  statusCode: number
}

async function streamAssistantTurn(
  channel: NonNullable<Awaited<ReturnType<typeof selectChannel>>>,
  model: string,
  messages: unknown[],
  onDelta?: (content: string) => void,
  options?: { tools?: unknown[], toolChoice?: string },
): Promise<StreamedAssistantTurn> {
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.2,
    stream: true,
  }
  if (options?.tools?.length) {
    payload.tools = options.tools
    payload.tool_choice = options.toolChoice || 'auto'
  }

  const upstream = await proxyToChannelStream(
    channel,
    'v1/chat/completions',
    'POST',
    { 'Content-Type': 'application/json' },
    payload,
  )
  const reader = upstream.body!.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let totalTokens = 0
  const toolCalls = new Map<number, { id?: string, name?: string, arguments: string }>()

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: '))
        continue
      const data = line.slice(6).trim()
      if (!data || data === '[DONE]')
        continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed.choices?.[0]?.delta
        const content = delta?.content || parsed.delta?.text || ''
        if (content) {
          fullContent += content
          onDelta?.(content)
        }
        for (const toolDelta of delta?.tool_calls || []) {
          const index = typeof toolDelta.index === 'number' ? toolDelta.index : 0
          const current = toolCalls.get(index) || { arguments: '' }
          if (toolDelta.id)
            current.id = toolDelta.id
          if (toolDelta.function?.name)
            current.name = toolDelta.function.name
          if (toolDelta.function?.arguments)
            current.arguments += toolDelta.function.arguments
          toolCalls.set(index, current)
        }
        if (parsed.usage?.total_tokens)
          totalTokens = parsed.usage.total_tokens
      }
      catch {}
    }
  }

  const normalizedToolCalls = [...toolCalls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([index, toolCall], order) => ({
      id: toolCall.id || `tool-call-${order}`,
      type: 'function' as const,
      function: {
        name: String(toolCall.name || ''),
        arguments: toolCall.arguments || '{}',
      },
    }))
    .filter(toolCall => toolCall.function.name)

  return {
    message: {
      role: 'assistant',
      content: fullContent || null,
      tool_calls: normalizedToolCalls.length ? normalizedToolCalls : undefined,
    },
    totalTokens,
    statusCode: upstream.status || 200,
  }
}

async function streamCompletion(
  channel: NonNullable<Awaited<ReturnType<typeof selectChannel>>>,
  model: string,
  messages: unknown[],
  onDelta: (content: string) => void,
) {
  const upstream = await proxyToChannelStream(
    channel,
    'v1/chat/completions',
    'POST',
    { 'Content-Type': 'application/json' },
    {
      model,
      messages,
      temperature: 0.2,
      stream: true,
    },
  )
  const reader = upstream.body!.getReader()
  const decoder = new TextDecoder()
  let fullReply = ''
  let totalTokens = 0
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
        const delta = parsed.choices?.[0]?.delta?.content || parsed.delta?.text || ''
        if (delta) {
          fullReply += delta
          onDelta(delta)
        }
        if (parsed.usage?.total_tokens)
          totalTokens = parsed.usage.total_tokens
      }
      catch {}
    }
  }
  return { reply: fullReply, totalTokens, statusCode: upstream.status || 200 }
}

async function loadBotHistory(conversationId: string) {
  const rows = await db
    .select()
    .from(conversationMessage)
    .where(eq(conversationMessage.conversationId, conversationId))
    .orderBy(asc(conversationMessage.createdAt))
    .limit(20)
  return rows
    .filter(row => row.role === 'user' || row.role === 'assistant')
    .map(row => ({ role: row.role, content: row.content }))
}

async function buildFallbackReply(
  principal: { isAdmin?: boolean, userId: string, organizationId?: string | null },
  message: string,
  onDelta?: (content: string) => void,
) {
  const tool = pickBotTool(message)
  const input = { days: 30, limit: 5 }
  const startedAt = Date.now()
  try {
    const result = await runBotTool(tool, principal, input)
    const reply = summarizeToolResult(tool, result)
    if (onDelta)
      emitReplyDeltas(reply, onDelta)
    return {
      reply,
      toolSteps: [{ name: tool, input, result, status: 'called' as const, latency: Date.now() - startedAt }],
      totalTokens: Math.ceil((message.length + reply.length) / 4),
      statusCode: 200,
      provider: 'internal',
    }
  }
  catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Bot tool failed'
    if (onDelta)
      emitReplyDeltas(errorMessage, onDelta)
    return {
      reply: errorMessage,
      toolSteps: [{ name: tool, input, result: { error: errorMessage }, status: 'failed' as const, latency: Date.now() - startedAt }],
      totalTokens: Math.ceil((message.length + errorMessage.length) / 4),
      statusCode: 500,
      provider: 'internal',
    }
  }
}

async function buildModelReply(
  principal: { isAdmin?: boolean, userId: string, organizationId?: string | null },
  message: string,
  conversationId: string,
  model: string,
  onDelta?: (content: string) => void,
) {
  const channel = await selectChannel(model, principal.organizationId)
  if (!channel)
    return buildFallbackReply(principal, message, onDelta)

  const toolSteps: BotToolStep[] = []
  const messages: any[] = [
    { role: 'system', content: buildBotSystemPrompt(principal) },
    ...(await loadBotHistory(conversationId)),
    { role: 'user', content: message },
  ]
  let totalTokens = 0
  let statusCode = 200

  for (let remaining = MAX_BOT_TOOL_CALLS; remaining >= 0; remaining--) {
    const streamedTurn = onDelta
      ? await streamAssistantTurn(channel, model, messages, onDelta, {
          tools: BOT_TOOL_DEFINITIONS,
          toolChoice: 'auto',
        })
      : null
    const response = streamedTurn
      ? { status: streamedTurn.statusCode, body: JSON.stringify({ choices: [{ message: streamedTurn.message }], usage: { total_tokens: streamedTurn.totalTokens } }) }
      : await proxyToChannel(
          channel,
          'v1/chat/completions',
          'POST',
          { 'Content-Type': 'application/json' },
          {
            model,
            messages,
            tools: BOT_TOOL_DEFINITIONS,
            tool_choice: 'auto',
            temperature: 0.2,
          },
        )
    statusCode = response.status
    const { message: assistantMessage, usage } = extractAssistantMessage(response.body)
    totalTokens += getUsageTotal(usage)

    const toolCalls = Array.isArray(assistantMessage?.tool_calls) ? assistantMessage.tool_calls.slice(0, remaining) : []
    if (toolCalls.length === 0) {
      const reply = assistantMessage?.content || summarizeToolResultFromSteps(toolSteps) || 'No answer was generated.'
      const hasRestrictedResult = toolSteps.some(step => shouldShowRestrictedNotice(step.result))
      const restrictedSuffix = hasRestrictedResult && !reply.includes('Restricted by permissions')
        ? '\n\nRestricted by permissions: some data is not visible.'
        : ''
      const normalizedReply = `${reply}${restrictedSuffix}`
      if (onDelta && !streamedTurn)
        emitReplyDeltas(normalizedReply, onDelta)
      else if (onDelta && restrictedSuffix)
        onDelta(restrictedSuffix)
      return { reply: normalizedReply, toolSteps, totalTokens, statusCode, provider: channel.vendor }
    }

    messages.push(assistantMessage)
    for (const toolCall of toolCalls) {
      const name = String(toolCall.function?.name || '')
      const input = parseBotToolArguments(toolCall.function?.arguments)
      const startedAt = Date.now()
      try {
        const result = await runBotTool(name, principal, input)
        toolSteps.push({ name, input, result, status: 'called', latency: Date.now() - startedAt })
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Bot tool failed'
        const result = { error: errorMessage }
        toolSteps.push({ name, input, result, status: 'failed', message: errorMessage, latency: Date.now() - startedAt })
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
    }
    if (toolSteps.length >= MAX_BOT_TOOL_CALLS)
      break
  }

  if (onDelta) {
    const streamed = await streamCompletion(channel, model, messages, onDelta)
    return {
      reply: streamed.reply || summarizeToolResultFromSteps(toolSteps) || 'Tool call limit reached before a final answer was generated.',
      toolSteps,
      totalTokens: streamed.totalTokens || totalTokens,
      statusCode: streamed.statusCode,
      provider: channel.vendor,
    }
  }

  return {
    reply: summarizeToolResultFromSteps(toolSteps) || 'Tool call limit reached before a final answer was generated.',
    toolSteps,
    totalTokens,
    statusCode,
    provider: channel.vendor,
  }
}

function summarizeToolResultFromSteps(toolSteps: BotToolStep[]) {
  const lastSuccessful = [...toolSteps].reverse().find(step => step.status === 'called')
  return lastSuccessful ? summarizeToolResult(lastSuccessful.name, lastSuccessful.result) : ''
}

async function buildBotReply(
  principal: { isAdmin?: boolean, userId: string, organizationId?: string | null },
  message: string,
  requestedConversationId?: string,
  onDelta?: (content: string) => void,
  onReady?: (meta: { conversationId: string }) => void,
) {
  let conversationId = requestedConversationId || ''
  if (conversationId) {
    const [existing] = await db
      .select()
      .from(conversation)
      .where(and(eq(conversation.id, conversationId), eq(conversation.userId, principal.userId)))
      .limit(1)
    if (!existing || existing.type !== 'bot')
      conversationId = ''
  }
  if (!conversationId) {
    const [created] = await db
      .insert(conversation)
      .values({
        agentId: null,
        userId: principal.userId,
        title: message.slice(0, 40),
        type: 'bot',
      })
      .returning()
    conversationId = created!.id
  }

  onReady?.({ conversationId })

  const model = await resolveBotModelId(principal.organizationId)
  const generated = await buildModelReply(principal, message, conversationId, model, onDelta)
  const reply = generated.reply
  const totalTokens = generated.totalTokens || Math.ceil((message.length + reply.length) / 4)
  const toolSteps = generated.toolSteps

  await db.insert(conversationMessage).values([
    { conversationId, role: 'user', content: message, tokens: Math.ceil(message.length / 4) },
    {
      conversationId,
      role: 'assistant',
      content: reply,
      tokens: Math.ceil(reply.length / 4),
      metadata: { toolSteps },
    },
  ])
  await db
    .update(conversation)
    .set({ messageCount: sql`${conversation.messageCount} + 2` })
    .where(eq(conversation.id, conversationId))

  try {
    await db.insert(apiLog).values({
      userId: principal.userId,
      organizationId: principal.organizationId ?? null,
      model,
      provider: generated.provider,
      type: 'bot',
      totalTokens,
      statusCode: generated.statusCode,
      status: generated.statusCode >= 400 ? 'error' : 'success',
      prompt: message.slice(0, 2000),
      response: reply.slice(0, 2000),
    })
    if (principal.organizationId && totalTokens > 0)
      await consumeQuota(principal.organizationId, totalTokens)
  }
  catch {
    // Usage accounting should not block the assistant response.
  }

  return { conversationId, message: reply, toolSteps }
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, userId?: string, organizationId?: string | null }
      | undefined
    if (!principal?.userId)
      return responseError(null, 'Unauthorized', { statusCode: 401 })

    const body = await readBody(event)
    const message = String(body?.message || '').trim()
    if (!message)
      return responseError(null, 'Message is required', { statusCode: 400 })

    const requestedConversationId = typeof body?.conversationId === 'string' ? body.conversationId : undefined

    if (body?.stream) {
      setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      })

      const encoder = new TextEncoder()
      return new ReadableStream({
        async start(controller) {
          const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          try {
            const result = await buildBotReply(
              { isAdmin: principal.isAdmin, userId: principal.userId!, organizationId: principal.organizationId },
              message,
              requestedConversationId,
              (content) => send({ type: 'delta', content }),
              ({ conversationId }) => send({ type: 'start', conversationId, toolSteps: [] }),
            )
            send({ type: 'done', ...result })
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          }
          catch (err) {
            const errorMessage = err instanceof Error && err.message ? err.message : 'Bot stream failed'
            send({ type: 'error', message: errorMessage })
          }
          finally {
            controller.close()
          }
        },
      })
    }

    const result = await buildBotReply(
      { isAdmin: principal.isAdmin, userId: principal.userId, organizationId: principal.organizationId },
      message,
      requestedConversationId,
    )
    return responseSuccess(result)
  }
  catch (err) {
    return responseError(err)
  }
})
