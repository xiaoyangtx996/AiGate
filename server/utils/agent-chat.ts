import { and, desc, eq, sql } from 'drizzle-orm'
import { loadAgentBindings } from '#server/utils/agent-bindings'
import { proxyToChannel, proxyToChannelStream, selectChannel } from '#server/utils/gateway'
import { estimateTokens, searchKnowledgeBase } from '#server/utils/knowledge-rag'
import { db } from '@/db/drizzle'
import { agent, apiLog, conversation, conversationMessage } from '@/db/schema'

const UNSAFE_TOOL_NAME_RE = /[^\w-]/g
const REPEATED_UNDERSCORE_RE = /_+/g

interface AgentScope {
  isAdmin?: boolean
  organizationId?: string | null
}

interface RuntimeReference {
  knowledgeBaseId: string
  knowledgeBaseName: string
  documentId: string
  chunkId: string
  sort: number
  content: string
  score: number
}

interface RuntimeToolStep {
  toolId: string
  name: string
  transportType?: string
  status: 'ready' | 'bound' | 'called' | 'failed' | 'not_executable'
  message: string
  latency?: number
}

interface RuntimeToolExecutor {
  label: string
  execute: (args: Record<string, unknown>) => Promise<string>
}

interface AgentRuntime {
  systemPrompt: string
  references: RuntimeReference[]
  toolSteps: RuntimeToolStep[]
  modelTools: Array<Record<string, unknown>>
  toolExecutors: Record<string, RuntimeToolExecutor>
}

export async function getAgentWithConfig(agentId: string, scope?: AgentScope) {
  const where
    = scope && !scope.isAdmin && scope.organizationId
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
    if (existing)
      return existing
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

export async function getConversationHistory(conversationId: string, limit = 10) {
  const orderedQuery = db
    .select()
    .from(conversationMessage)
    .where(eq(conversationMessage.conversationId, conversationId))
    .orderBy(desc(conversationMessage.createdAt))
  const messages = 'limit' in orderedQuery
    ? await orderedQuery.limit(Math.max(1, limit))
    : await orderedQuery
  return messages.reverse().map(m => ({ role: m.role, content: m.content }))
}

export async function saveMessage(
  conversationId: string,
  role: string,
  content: string,
  tokens?: number,
  latency?: number,
  metadata?: Record<string, unknown>,
) {
  await db.insert(conversationMessage).values({
    conversationId,
    role,
    content,
    tokens: tokens || 0,
    latency: latency || 0,
    metadata: metadata || {},
  })
  await db
    .update(conversation)
    .set({
      messageCount: sql`${conversation.messageCount} + 1`,
    })
    .where(eq(conversation.id, conversationId))
}

function safeToolName(value: string) {
  const normalized = value.replace(UNSAFE_TOOL_NAME_RE, '_').replace(REPEATED_UNDERSCORE_RE, '_')
  return normalized.slice(0, 64) || 'tool'
}

function extractMcpEndpoint(tool: Record<string, any>) {
  const config = (tool.config || {}) as Record<string, any>
  return tool.serverUrl || config.endpoint || config.url
}

function parseSseJson(text: string) {
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: '))
      continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]')
      continue
    try {
      return JSON.parse(data)
    }
    catch {
      continue
    }
  }
  return null
}

async function readJsonRpcResponse(response: Response) {
  const contentType = response.headers?.get?.('content-type') || ''
  if (contentType.includes('text/event-stream') && typeof response.text === 'function')
    return parseSseJson(await response.text())
  if (typeof response.json === 'function')
    return response.json()
  if (typeof response.text === 'function')
    return JSON.parse(await response.text())
  return null
}

function extractMcpTools(payload: any) {
  if (Array.isArray(payload?.result?.tools))
    return payload.result.tools
  if (Array.isArray(payload?.tools))
    return payload.tools
  if (Array.isArray(payload?.result))
    return payload.result
  return []
}

async function fetchMcpTools(endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'aigate-tools-list',
      method: 'tools/list',
      params: {},
    }),
  })
  if (response.status >= 500)
    throw new Error(`HTTP ${response.status}`)
  return extractMcpTools(await readJsonRpcResponse(response as Response))
}

async function callMcpTool(endpoint: string, name: string, args: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `aigate-tool-call-${Date.now()}`,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  })
  if (response.status >= 500)
    throw new Error(`HTTP ${response.status}`)
  return JSON.stringify((await readJsonRpcResponse(response as Response))?.result ?? {})
}

function parseToolArguments(value: unknown) {
  if (!value)
    return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    }
    catch {
      return {}
    }
  }
  if (typeof value === 'object')
    return value as Record<string, unknown>
  return {}
}

function resolveAgentContextBudget(agentRecord: typeof agent.$inferSelect) {
  const contextWindow = Number((agentRecord as typeof agent.$inferSelect & { contextWindow?: number | null }).contextWindow)
  const fallbackWindow = Math.max(Number(agentRecord.maxTokens) || 0, 4096)
  return Math.floor((contextWindow > 0 ? contextWindow : fallbackWindow) * 0.8)
}

async function buildAgentRuntime(agentRecord: typeof agent.$inferSelect, userMessage: string): Promise<AgentRuntime> {
  const bindings = agentRecord.skillEnabled || agentRecord.ragEnabled || agentRecord.mcpEnabled
    ? await loadAgentBindings(agentRecord.id)
    : { knowledgeBases: [], tools: [], skills: [] }
  const references: RuntimeReference[] = []
  const toolSteps: RuntimeToolStep[] = []
  const modelTools: AgentRuntime['modelTools'] = []
  const toolExecutors: AgentRuntime['toolExecutors'] = {}
  const systemParts = [agentRecord.systemPrompt || 'You are a helpful assistant.']

  if (agentRecord.skillEnabled) {
    const enabledSkills = bindings.skills.filter(item => Boolean(item) && item?.enabled !== false)
    if (enabledSkills.length > 0) {
      systemParts.push(
        `Bound skills:\n${enabledSkills
          .map((item) => {
            if (!item)
              return ''
            return `## ${item.name}\n${item.description || ''}\n${item.content}`
          })
          .filter(Boolean)
          .join('\n\n')}`,
      )
    }
  }

  if (agentRecord.ragEnabled && agentRecord.ragCallMode === 'force') {
    for (const kb of bindings.knowledgeBases) {
      if (!kb || kb.enabled === false)
        continue
      const hits = await searchKnowledgeBase(kb.id, userMessage, kb.topK || 5)
      references.push(
        ...hits.map(hit => ({
          knowledgeBaseId: kb.id,
          knowledgeBaseName: kb.name,
          documentId: hit.documentId,
          chunkId: hit.id,
          sort: hit.sort,
          content: hit.content,
          score: hit.score,
        })),
      )
    }
    if (references.length > 0) {
      systemParts.push(
        `Knowledge context:\n${references
          .map((item, index) => `[${index + 1}] ${item.knowledgeBaseName} / chunk ${item.sort}\n${item.content}`)
          .join('\n\n')}`,
      )
    }
  }
  else if (agentRecord.ragEnabled && agentRecord.ragCallMode === 'auto') {
    for (const kb of bindings.knowledgeBases) {
      if (!kb || kb.enabled === false)
        continue
      const functionName = safeToolName(`search_kb_${kb.id}`)
      modelTools.push({
        type: 'function',
        function: {
          name: functionName,
          description: `Search bound knowledge base: ${kb.name}`,
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              topK: { type: 'number', minimum: 1, maximum: 10 },
            },
            required: ['query'],
          },
        },
      })
      toolExecutors[functionName] = {
        label: kb.name,
        execute: async (args) => {
          const query = String(args.query || userMessage)
          const hits = await searchKnowledgeBase(kb.id, query, Number(args.topK || kb.topK || 5))
          const mapped = hits.map(hit => ({
            knowledgeBaseId: kb.id,
            knowledgeBaseName: kb.name,
            documentId: hit.documentId,
            chunkId: hit.id,
            sort: hit.sort,
            content: hit.content,
            score: hit.score,
          }))
          references.push(...mapped)
          return JSON.stringify(mapped)
        },
      }
      toolSteps.push({
        toolId: kb.id,
        name: kb.name,
        status: 'ready',
        message: 'knowledge base search is available to the model',
      })
    }
  }

  if (agentRecord.mcpEnabled) {
    for (const tool of bindings.tools.filter(item => item?.enabled !== false)) {
      if (!tool)
        continue
      if (tool.transportType === 'stdio') {
        toolSteps.push({
          toolId: tool.id,
          name: tool.name,
          transportType: tool.transportType,
          status: 'not_executable',
          message: 'stdio tools are visible but not executable in agent chat',
        })
        continue
      }
      const endpoint = extractMcpEndpoint(tool)
      if (!endpoint) {
        toolSteps.push({
          toolId: tool.id,
          name: tool.name,
          transportType: tool.transportType,
          status: 'failed',
          message: 'MCP endpoint is not configured',
        })
        continue
      }
      try {
        const remoteTools = await fetchMcpTools(endpoint)
        if (remoteTools.length === 0) {
          toolSteps.push({
            toolId: tool.id,
            name: tool.name,
            transportType: tool.transportType,
            status: 'bound',
            message: 'MCP server is bound but did not advertise callable tools',
          })
          continue
        }
        for (const remoteTool of remoteTools) {
          const remoteName = String(remoteTool.name || '').trim()
          if (!remoteName)
            continue
          const functionName = safeToolName(`mcp_${tool.id}_${remoteName}`)
          modelTools.push({
            type: 'function',
            function: {
              name: functionName,
              description: remoteTool.description || `${tool.name}: ${remoteName}`,
              parameters: remoteTool.inputSchema || remoteTool.parameters || {
                type: 'object',
                properties: {},
              },
            },
          })
          toolExecutors[functionName] = {
            label: `${tool.name}/${remoteName}`,
            execute: args => callMcpTool(endpoint, remoteName, args),
          }
        }
        toolSteps.push({
          toolId: tool.id,
          name: tool.name,
          transportType: tool.transportType,
          status: 'ready',
          message: `${remoteTools.length} MCP tools are available to the model`,
        })
      }
      catch (err) {
        toolSteps.push({
          toolId: tool.id,
          name: tool.name,
          transportType: tool.transportType,
          status: 'failed',
          message: err instanceof Error ? err.message : 'MCP tool discovery failed',
        })
      }
    }
  }

  const tokenEstimate = estimateTokens(systemParts.join('\n\n'))
  const contextBudget = resolveAgentContextBudget(agentRecord)
  if (tokenEstimate > contextBudget) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Agent context is too large. Reduce bound skills or knowledge references.',
    })
  }

  return {
    systemPrompt: systemParts.join('\n\n'),
    references,
    toolSteps,
    modelTools,
    toolExecutors,
  }
}

export async function sendAgentMessage(
  agentId: string,
  userId: string,
  userMessage: string,
  conversationId?: string,
  scope?: AgentScope,
) {
  const agentRecord = await getAgentWithConfig(agentId, scope)
  if (!agentRecord)
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })

  const conv = await getOrCreateConversation(agentId, userId, conversationId, scope)
  const history = agentRecord.memoryEnabled
    ? await getConversationHistory(conv.id, agentRecord.shortTermMemorySize || 10)
    : []
  const runtime = await buildAgentRuntime(agentRecord, userMessage)

  await saveMessage(conv.id, 'user', userMessage)

  const channelConfig = await selectChannel(agentRecord.model || 'gpt-4o', agentRecord.organizationId)
  if (!channelConfig)
    throw createError({ statusCode: 503, statusMessage: 'No available channel' })

  const allMessages = [{ role: 'system', content: runtime.systemPrompt }, ...history, { role: 'user', content: userMessage }]

  const startTime = Date.now()
  const requestBody: Record<string, unknown> = {
    model: agentRecord.model || 'gpt-4o',
    messages: allMessages,
    temperature: (agentRecord.temperature ?? 30) / 100,
    max_tokens: agentRecord.maxTokens ?? 4096,
  }
  if (runtime.modelTools.length > 0) {
    requestBody.tools = runtime.modelTools
    requestBody.tool_choice = 'auto'
  }
  const result = await proxyToChannel(
    channelConfig,
    'v1/chat/completions',
    'POST',
    { 'Content-Type': 'application/json' },
    requestBody,
  )
  const latency = Date.now() - startTime

  let reply = result.body
  let usage: any = null
  try {
    const parsed = JSON.parse(result.body)
    const message = parsed.choices?.[0]?.message
    if (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
      const toolMessages = await executeRuntimeToolCalls(message, runtime)
      if (toolMessages.length > 0) {
        const finalResult = await proxyToChannel(
          channelConfig,
          'v1/chat/completions',
          'POST',
          { 'Content-Type': 'application/json' },
          {
            model: agentRecord.model || 'gpt-4o',
            messages: [...allMessages, message, ...toolMessages],
            temperature: (agentRecord.temperature ?? 30) / 100,
            max_tokens: agentRecord.maxTokens ?? 4096,
          },
        )
        const finalParsed = JSON.parse(finalResult.body)
        reply = finalParsed.choices?.[0]?.message?.content || finalResult.body
        usage = finalParsed.usage || parsed.usage
      }
      else {
        reply = message?.content || result.body
        usage = parsed.usage
      }
    }
    else {
      reply = message?.content || result.body
      usage = parsed.usage
    }
  }
  catch {}

  await saveMessage(conv.id, 'assistant', reply, usage?.total_tokens, latency, {
    references: runtime.references,
    toolSteps: runtime.toolSteps,
  })

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
    references: runtime.references,
    toolSteps: runtime.toolSteps,
  }
}

function totalTokensFromUsage(usage: { total_tokens?: number } | null) {
  return usage?.total_tokens || 0
}

async function executeRuntimeToolCalls(message: any, runtime: AgentRuntime) {
  const toolMessages = []
  for (const toolCall of message.tool_calls || []) {
    const functionName = toolCall.function?.name
    const executor = functionName ? runtime.toolExecutors[functionName] : null
    if (!executor)
      continue
    const callStartedAt = Date.now()
    try {
      const content = await executor.execute(parseToolArguments(toolCall.function?.arguments))
      toolMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content,
      })
      runtime.toolSteps.push({
        toolId: functionName,
        name: executor.label,
        status: 'called',
        message: 'tool call completed',
        latency: Date.now() - callStartedAt,
      })
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'tool call failed'
      toolMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: errorMessage }),
      })
      runtime.toolSteps.push({
        toolId: functionName,
        name: executor.label,
        status: 'failed',
        message: errorMessage,
        latency: Date.now() - callStartedAt,
      })
    }
  }
  return toolMessages
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
  if (!agentRecord)
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })

  const conv = await getOrCreateConversation(agentId, userId, conversationId, scope)
  const history = agentRecord.memoryEnabled
    ? await getConversationHistory(conv.id, agentRecord.shortTermMemorySize || 10)
    : []
  const runtime = await buildAgentRuntime(agentRecord, userMessage)
  await saveMessage(conv.id, 'user', userMessage)

  const channelConfig = await selectChannel(agentRecord.model || 'gpt-4o', agentRecord.organizationId)
  if (!channelConfig)
    throw createError({ statusCode: 503, statusMessage: 'No available channel' })

  const allMessages = [
    { role: 'system', content: runtime.systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]

  const startTime = Date.now()
  let streamMessages = allMessages
  let totalTokens = 0
  let statusCode = 200

  yield { type: 'start', conversationId: conv.id, references: runtime.references, toolSteps: runtime.toolSteps }

  if (runtime.modelTools.length > 0) {
    const planningResult = await proxyToChannel(
      channelConfig,
      'v1/chat/completions',
      'POST',
      { 'Content-Type': 'application/json' },
      {
        model: agentRecord.model || 'gpt-4o',
        messages: allMessages,
        temperature: (agentRecord.temperature ?? 30) / 100,
        max_tokens: agentRecord.maxTokens ?? 4096,
        tools: runtime.modelTools,
        tool_choice: 'auto',
      },
    )
    statusCode = planningResult.status
    try {
      const parsed = JSON.parse(planningResult.body)
      const message = parsed.choices?.[0]?.message
      totalTokens += parsed.usage?.total_tokens || 0
      if (Array.isArray(message?.tool_calls) && message.tool_calls.length > 0) {
        const toolMessages = await executeRuntimeToolCalls(message, runtime)
        if (toolMessages.length > 0)
          streamMessages = [...allMessages, message, ...toolMessages]
      }
      else if (message?.content) {
        const fullReply = message.content
        yield { type: 'delta', content: fullReply }
        const latency = Date.now() - startTime
        await saveMessage(conv.id, 'assistant', fullReply, totalTokens, latency, {
          references: runtime.references,
          toolSteps: runtime.toolSteps,
        })
        await logAgentApiCall(
          agentId,
          userId,
          agentRecord.organizationId,
          agentRecord.model || 'gpt-4o',
          channelConfig.vendor,
          totalTokens,
          latency,
          statusCode,
        )
        yield {
          type: 'done',
          conversationId: conv.id,
          message: fullReply,
          latency,
          usage: { total_tokens: totalTokens },
          references: runtime.references,
          toolSteps: runtime.toolSteps,
        }
        return
      }
    }
    catch {
      streamMessages = allMessages
    }
  }

  const upstream = await proxyToChannelStream(
    channelConfig,
    'v1/chat/completions',
    'POST',
    { 'Content-Type': 'application/json' },
    {
      model: agentRecord.model || 'gpt-4o',
      messages: streamMessages,
      temperature: (agentRecord.temperature ?? 30) / 100,
      max_tokens: agentRecord.maxTokens ?? 4096,
      stream: true,
    },
  )

  const reader = upstream.body!.getReader()
  const decoder = new TextDecoder()
  let fullReply = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: '))
        continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]')
        continue
      try {
        const parsed = JSON.parse(payload)
        const delta = parsed.choices?.[0]?.delta?.content || ''
        if (delta) {
          fullReply += delta
          yield { type: 'delta', content: delta }
        }
        if (parsed.usage?.total_tokens)
          totalTokens = parsed.usage.total_tokens
      }
      catch {
        /* skip malformed chunks */
      }
    }
  }

  const latency = Date.now() - startTime
  await saveMessage(conv.id, 'assistant', fullReply, totalTokens, latency, {
    references: runtime.references,
    toolSteps: runtime.toolSteps,
  })
  await logAgentApiCall(
    agentId,
    userId,
    agentRecord.organizationId,
    agentRecord.model || 'gpt-4o',
    channelConfig.vendor,
    totalTokens,
    latency,
    statusCode,
  )

  yield {
    type: 'done',
    conversationId: conv.id,
    message: fullReply,
    latency,
    usage: { total_tokens: totalTokens },
    references: runtime.references,
    toolSteps: runtime.toolSteps,
  }
}

export async function getUserConversations(userId: string, agentId?: string) {
  const conditions = [eq(conversation.userId, userId)]
  if (agentId)
    conditions.push(eq(conversation.agentId, agentId))
  return db
    .select()
    .from(conversation)
    .where(and(...conditions))
    .orderBy(desc(conversation.updatedAt))
    .limit(50)
}
