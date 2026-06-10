import { and, desc, eq, sql } from 'drizzle-orm'
import { proxyToChannel, proxyToChannelStream, selectChannel } from '#server/utils/gateway'
import { db } from '@/db/drizzle'
import { agent, apiLog, conversation, conversationMessage } from '@/db/schema'

interface AgentScope {
  isAdmin?: boolean
  organizationId?: string | null
}

export async function getAgentWithConfig(agentId: string, scope?: AgentScope) {
  const where =
    scope && !scope.isAdmin && scope.organizationId
      ? and(eq(agent.id, agentId), eq(agent.organizationId, scope.organizationId))
      : eq(agent.id, agentId)
  const [agentRecord] = await db.select().from(agent).where(where)
  return agentRecord
}

export async function getOrCreateConversation(
  agentId: string,
  userId: string,
  conversationId?: string,
  scope?: AgentScope,
) {
  if (conversationId) {
    const [existing] = await db.select().from(conversation).where(eq(conversation.id, conversationId))
    if (existing) return existing
  }
  const agentRecord = await getAgentWithConfig(agentId, scope)
  const title = `${agentRecord?.name || 'Agent'} 对话`
  const [conv] = await db
    .insert(conversation)
    .values({
      agentId,
      userId,
      title,
    })
    .returning()
  if (!conv) {
    throw createError({ statusCode: 500, statusMessage: 'Conversation creation failed' })
  }
  return conv
}

export async function getConversationHistory(conversationId: string) {
  const messages = await db
    .select()
    .from(conversationMessage)
    .where(eq(conversationMessage.conversationId, conversationId))
    .orderBy(conversationMessage.createdAt)
  return messages.map(m => ({ role: m.role, content: m.content }))
}

export async function saveMessage(
  conversationId: string,
  role: string,
  content: string,
  tokens?: number,
  latency?: number,
) {
  await db.insert(conversationMessage).values({
    conversationId,
    role,
    content,
    tokens: tokens || 0,
    latency: latency || 0,
  })
  await db
    .update(conversation)
    .set({
      messageCount: sql`${conversation.messageCount} + 1`,
    })
    .where(eq(conversation.id, conversationId))
}

export async function sendAgentMessage(
  agentId: string,
  userId: string,
  userMessage: string,
  conversationId?: string,
  scope?: AgentScope,
) {
  const agentRecord = await getAgentWithConfig(agentId, scope)
  if (!agentRecord) throw createError({ statusCode: 404, statusMessage: 'Agent not found' })

  const conv = await getOrCreateConversation(agentId, userId, conversationId, scope)
  const history = await getConversationHistory(conv.id)

  await saveMessage(conv.id, 'user', userMessage)

  const channelConfig = await selectChannel()
  if (!channelConfig) throw createError({ statusCode: 503, statusMessage: 'No available channel' })

  const systemPrompt = agentRecord.systemPrompt || 'You are a helpful assistant.'
  const allMessages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }]

  const startTime = Date.now()
  const result = await proxyToChannel(
    channelConfig,
    'v1/chat/completions',
    'POST',
    { 'Content-Type': 'application/json' },
    {
      model: agentRecord.model || 'gpt-4o',
      messages: allMessages,
      temperature: (agentRecord.temperature ?? 30) / 100,
      max_tokens: agentRecord.maxTokens ?? 4096,
    },
  )
  const latency = Date.now() - startTime

  let reply = result.body
  let usage: any = null
  try {
    const parsed = JSON.parse(result.body)
    reply = parsed.choices?.[0]?.message?.content || result.body
    usage = parsed.usage
  } catch {}

  await saveMessage(conv.id, 'assistant', reply, usage?.total_tokens, latency)

  await logAgentApiCall(
    agentId,
    userId,
    agentRecord.organizationId,
    agentRecord.model || 'gpt-4o',
    channelConfig.vendor,
    totalTokensFromUsage(usage),
    latency,
    result.status,
  )

  return {
    conversationId: conv.id,
    message: reply,
    latency,
    usage,
  }
}

function totalTokensFromUsage(usage: { total_tokens?: number } | null) {
  return usage?.total_tokens || 0
}

async function logAgentApiCall(
  agentId: string,
  userId: string,
  organizationId: string | null,
  model: string,
  provider: string,
  totalTokens: number,
  latency: number,
  statusCode: number,
) {
  await db
    .insert(apiLog)
    .values({
      userId,
      agentId,
      organizationId,
      model,
      provider,
      type: 'agent_chat',
      totalTokens,
      latency,
      statusCode,
      status: statusCode >= 400 ? 'error' : 'success',
    })
    .execute()
    .catch(() => {})
}

export async function* streamAgentMessage(
  agentId: string,
  userId: string,
  userMessage: string,
  conversationId?: string,
  scope?: AgentScope,
) {
  const agentRecord = await getAgentWithConfig(agentId, scope)
  if (!agentRecord) throw createError({ statusCode: 404, statusMessage: 'Agent not found' })

  const conv = await getOrCreateConversation(agentId, userId, conversationId, scope)
  const history = await getConversationHistory(conv.id)
  await saveMessage(conv.id, 'user', userMessage)

  const channelConfig = await selectChannel()
  if (!channelConfig) throw createError({ statusCode: 503, statusMessage: 'No available channel' })

  const allMessages = [
    { role: 'system', content: agentRecord.systemPrompt || 'You are a helpful assistant.' },
    ...history,
    { role: 'user', content: userMessage },
  ]

  const startTime = Date.now()
  const upstream = await proxyToChannelStream(
    channelConfig,
    'v1/chat/completions',
    'POST',
    { 'Content-Type': 'application/json' },
    {
      model: agentRecord.model || 'gpt-4o',
      messages: allMessages,
      temperature: (agentRecord.temperature ?? 30) / 100,
      max_tokens: agentRecord.maxTokens ?? 4096,
      stream: true,
    },
  )

  const reader = upstream.body!.getReader()
  const decoder = new TextDecoder()
  let fullReply = ''
  let totalTokens = 0

  yield { type: 'start', conversationId: conv.id }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') continue
      try {
        const parsed = JSON.parse(payload)
        const delta = parsed.choices?.[0]?.delta?.content || ''
        if (delta) {
          fullReply += delta
          yield { type: 'delta', content: delta }
        }
        if (parsed.usage?.total_tokens) totalTokens = parsed.usage.total_tokens
      } catch {
        /* skip malformed chunks */
      }
    }
  }

  const latency = Date.now() - startTime
  await saveMessage(conv.id, 'assistant', fullReply, totalTokens, latency)
  await logAgentApiCall(
    agentId,
    userId,
    agentRecord.organizationId,
    agentRecord.model || 'gpt-4o',
    channelConfig.vendor,
    totalTokens,
    latency,
    200,
  )

  yield { type: 'done', conversationId: conv.id, message: fullReply, latency, usage: { total_tokens: totalTokens } }
}

export async function getUserConversations(userId: string, agentId?: string) {
  const conditions = [eq(conversation.userId, userId)]
  if (agentId) conditions.push(eq(conversation.agentId, agentId))
  return db
    .select()
    .from(conversation)
    .where(and(...conditions))
    .orderBy(desc(conversation.updatedAt))
    .limit(50)
}
