import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getAgentWithConfig,
  getUserConversations,
  sendAgentMessage,
  streamAgentMessage,
} from '#server/utils/agent-chat'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSelectChannel = vi.fn()
const mockProxyToChannel = vi.fn()
const mockProxyToChannelStream = vi.fn()
const mockLoadAgentBindings = vi.fn()
const mockSearchKnowledgeBase = vi.fn()
const mockFetch = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: {
    id: 'id',
    name: 'name',
    model: 'model',
    systemPrompt: 'systemPrompt',
    temperature: 'temperature',
    maxTokens: 'maxTokens',
    organizationId: 'organizationId',
  },
  conversation: {
    id: 'id',
    agentId: 'agentId',
    userId: 'userId',
    title: 'title',
    messageCount: 'messageCount',
    updatedAt: 'updatedAt',
  },
  conversationMessage: {
    conversationId: 'conversationId',
    role: 'role',
    content: 'content',
    tokens: 'tokens',
    latency: 'latency',
    createdAt: 'createdAt',
  },
  apiLog: {
    userId: 'userId',
    agentId: 'agentId',
    organizationId: 'organizationId',
    model: 'model',
    provider: 'provider',
    type: 'type',
    totalTokens: 'totalTokens',
    latency: 'latency',
    statusCode: 'statusCode',
    status: 'status',
  },
}))

vi.mock('#server/utils/gateway', () => ({
  selectChannel: (...args: unknown[]) => mockSelectChannel(...args),
  proxyToChannel: (...args: unknown[]) => mockProxyToChannel(...args),
  proxyToChannelStream: (...args: unknown[]) => mockProxyToChannelStream(...args),
}))

vi.mock('#server/utils/agent-bindings', () => ({
  loadAgentBindings: (...args: unknown[]) => mockLoadAgentBindings(...args),
}))

vi.mock('#server/utils/knowledge-rag', () => ({
  estimateTokens: (content: string) => Math.max(1, Math.ceil(content.length / 4)),
  searchKnowledgeBase: (...args: unknown[]) => mockSearchKnowledgeBase(...args),
}))

vi.stubGlobal('fetch', (...args: unknown[]) => mockFetch(...args))

function createAgentSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createConversationSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

function createMessageSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
      execute: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function createSSEBody(chunks: string[]) {
  const encoder = new TextEncoder()
  let index = 0
  return {
    getReader: () => ({
      read: async () => {
        if (index >= chunks.length) {
          return { done: true, value: undefined }
        }
        return { done: false, value: encoder.encode(chunks[index++]) }
      },
    }),
  }
}

function setupAgentStreamMocks(agent: Record<string, unknown>) {
  mockSelect
    .mockReturnValueOnce(createAgentSelectChain([agent]))
    .mockReturnValueOnce(createAgentSelectChain([agent]))
    .mockReturnValueOnce(createMessageSelectChain([]))
  mockInsert.mockReturnValue(createInsertChain([{ id: 'conv-1', agentId: 'agent-1', userId: 'user-1' }]))
  mockUpdate.mockReturnValue(createUpdateChain())
  mockSelectChannel.mockResolvedValue({
    id: 'ch-1',
    endpoint: 'https://api.example.com/v1',
    vendor: 'openai',
    priority: 1,
    status: 'enabled',
    health: 'healthy',
  })
}

describe('agent-chat integration', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockLoadAgentBindings.mockResolvedValue({ knowledgeBases: [], tools: [], skills: [] })
    mockFetch.mockResolvedValue({
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ result: { tools: [] } }),
    })
  })

  describe('getAgentWithConfig', () => {
    it('should return agent record by id', async () => {
      const agent = { id: 'agent-1', name: 'Bot', model: 'gpt-4o' }
      mockSelect.mockReturnValue(createAgentSelectChain([agent]))

      expect(await getAgentWithConfig('agent-1')).toEqual(agent)
    })

    it('should return undefined when agent not found', async () => {
      mockSelect.mockReturnValue(createAgentSelectChain([]))

      expect(await getAgentWithConfig('missing')).toBeUndefined()
    })
  })

  describe('getUserConversations', () => {
    it('should list conversations for user ordered by updatedAt', async () => {
      const convs = [{ id: 'conv-1', title: 'Chat' }]
      mockSelect.mockReturnValue(createConversationSelectChain(convs))

      const result = await getUserConversations('user-1')

      expect(result).toEqual(convs)
    })
  })

  describe('sendAgentMessage', () => {
    it('should throw 404 when agent does not exist', async () => {
      mockSelect.mockReturnValue(createAgentSelectChain([]))

      await expect(sendAgentMessage('missing', 'user-1', 'hello')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Agent not found',
      })
    })

    it('should throw 503 when no channel is available', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: null,
        temperature: 30,
        maxTokens: 4096,
        organizationId: 'org-1',
      }
      mockSelect
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createMessageSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'conv-1', agentId: 'agent-1', userId: 'user-1' }]))
      mockUpdate.mockReturnValue(createUpdateChain())
      mockSelectChannel.mockResolvedValue(null)

      await expect(sendAgentMessage('agent-1', 'user-1', 'hello')).rejects.toMatchObject({
        statusCode: 503,
        message: 'No available channel',
      })
    })

    it('should reject oversized bound skill context before calling the gateway', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: 'Be helpful',
        temperature: 30,
        maxTokens: 4096,
        contextWindow: 100,
        organizationId: 'org-1',
        memoryEnabled: false,
        skillEnabled: true,
      }
      mockLoadAgentBindings.mockResolvedValue({
        knowledgeBases: [],
        tools: [],
        skills: [{
          id: 'skill-1',
          name: 'Large Skill',
          description: 'Too large',
          content: 'x'.repeat(500),
          enabled: true,
        }],
      })
      mockSelect
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createAgentSelectChain([agent]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'conv-1', agentId: 'agent-1', userId: 'user-1' }]))
      mockUpdate.mockReturnValue(createUpdateChain())

      await expect(sendAgentMessage('agent-1', 'user-1', 'hello')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Agent context is too large. Reduce bound skills or knowledge references.',
      })
      expect(mockSelectChannel).not.toHaveBeenCalled()
      expect(mockProxyToChannel).not.toHaveBeenCalled()
    })

    it('should return assistant reply when upstream succeeds', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: 'Be helpful',
        temperature: 30,
        maxTokens: 4096,
        organizationId: 'org-1',
      }
      mockSelect
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createMessageSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'conv-1', agentId: 'agent-1', userId: 'user-1' }]))
      mockUpdate.mockReturnValue(createUpdateChain())
      mockSelectChannel.mockResolvedValue({
        id: 'ch-1',
        endpoint: 'https://api.example.com/v1',
        vendor: 'openai',
        priority: 1,
        status: 'enabled',
        health: 'healthy',
      })
      mockProxyToChannel.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ choices: [{ message: { content: 'Hi there' } }], usage: { total_tokens: 12 } }),
        headers: {},
        latency: 50,
      })

      const result = await sendAgentMessage('agent-1', 'user-1', 'hello')

      expect(result.message).toBe('Hi there')
      expect(result.conversationId).toBe('conv-1')
      expect(mockProxyToChannel).toHaveBeenCalledTimes(1)
    })

    it('should expose auto RAG as model tool and run selected search', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: 'Be helpful',
        temperature: 30,
        maxTokens: 4096,
        organizationId: 'org-1',
        ragEnabled: true,
        ragCallMode: 'auto',
      }
      mockLoadAgentBindings.mockResolvedValue({
        knowledgeBases: [{ id: 'kb-1', name: 'Product KB', enabled: true, topK: 3 }],
        tools: [],
        skills: [],
      })
      mockSearchKnowledgeBase.mockResolvedValue([
        {
          id: 'chunk-1',
          documentId: 'doc-1',
          sort: 1,
          content: 'Pricing details',
          score: 0.91,
        },
      ])
      mockSelect
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createMessageSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'conv-1', agentId: 'agent-1', userId: 'user-1' }]))
      mockUpdate.mockReturnValue(createUpdateChain())
      mockSelectChannel.mockResolvedValue({
        id: 'ch-1',
        endpoint: 'https://api.example.com/v1',
        vendor: 'openai',
        priority: 1,
        status: 'enabled',
        health: 'healthy',
      })
      mockProxyToChannel
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({
            choices: [{
              message: {
                content: '',
                tool_calls: [{
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'search_kb_kb-1', arguments: JSON.stringify({ query: 'pricing', topK: 2 }) },
                }],
              },
            }],
            usage: { total_tokens: 8 },
          }),
          headers: {},
          latency: 30,
        })
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({ choices: [{ message: { content: 'Pricing answer' } }], usage: { total_tokens: 18 } }),
          headers: {},
          latency: 40,
        })

      const result = await sendAgentMessage('agent-1', 'user-1', 'hello')

      expect(result.message).toBe('Pricing answer')
      expect(mockProxyToChannel).toHaveBeenCalledTimes(2)
      expect((mockProxyToChannel.mock.calls[0]![4] as Record<string, unknown>).tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            function: expect.objectContaining({ name: 'search_kb_kb-1' }),
          }),
        ]),
      )
      expect(mockSearchKnowledgeBase).toHaveBeenCalledWith('kb-1', 'pricing', 2)
      expect(result.references).toHaveLength(1)
      expect(result.toolSteps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ toolId: 'kb-1', status: 'ready' }),
          expect.objectContaining({ toolId: 'search_kb_kb-1', status: 'called' }),
        ]),
      )
    })

    it('should discover and execute bound MCP tools selected by the model', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: 'Be helpful',
        temperature: 30,
        maxTokens: 4096,
        organizationId: 'org-1',
        mcpEnabled: true,
      }
      mockLoadAgentBindings.mockResolvedValue({
        knowledgeBases: [],
        tools: [{
          id: 'tool-1',
          name: 'Search MCP',
          transportType: 'sse',
          serverUrl: 'https://mcp.example.com/sse',
          enabled: true,
          config: {},
        }],
        skills: [],
      })
      mockFetch
        .mockResolvedValueOnce({
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            result: {
              tools: [{
                name: 'lookup',
                description: 'Lookup records',
                inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
              }],
            },
          }),
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ result: { content: [{ type: 'text', text: 'MCP result' }] } }),
        })
      mockSelect
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createAgentSelectChain([agent]))
        .mockReturnValueOnce(createMessageSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'conv-1', agentId: 'agent-1', userId: 'user-1' }]))
      mockUpdate.mockReturnValue(createUpdateChain())
      mockSelectChannel.mockResolvedValue({
        id: 'ch-1',
        endpoint: 'https://api.example.com/v1',
        vendor: 'openai',
        priority: 1,
        status: 'enabled',
        health: 'healthy',
      })
      mockProxyToChannel
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({
            choices: [{
              message: {
                content: '',
                tool_calls: [{
                  id: 'call-1',
                  type: 'function',
                  function: { name: 'mcp_tool-1_lookup', arguments: JSON.stringify({ query: 'issue' }) },
                }],
              },
            }],
          }),
          headers: {},
          latency: 30,
        })
        .mockResolvedValueOnce({
          status: 200,
          body: JSON.stringify({ choices: [{ message: { content: 'Final MCP answer' } }], usage: { total_tokens: 20 } }),
          headers: {},
          latency: 40,
        })

      const result = await sendAgentMessage('agent-1', 'user-1', 'hello')

      expect(result.message).toBe('Final MCP answer')
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string)).toMatchObject({ method: 'tools/list' })
      expect(JSON.parse((mockFetch.mock.calls[1]![1] as RequestInit).body as string)).toMatchObject({
        method: 'tools/call',
        params: { name: 'lookup', arguments: { query: 'issue' } },
      })
      expect((mockProxyToChannel.mock.calls[0]![4] as Record<string, unknown>).tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            function: expect.objectContaining({ name: 'mcp_tool-1_lookup' }),
          }),
        ]),
      )
      expect(result.toolSteps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ toolId: 'tool-1', status: 'ready' }),
          expect.objectContaining({ toolId: 'mcp_tool-1_lookup', status: 'called' }),
        ]),
      )
    })
  })

  describe('streamAgentMessage', () => {
    it('should yield start, delta and done events from SSE stream', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: 'Be helpful',
        temperature: 30,
        maxTokens: 4096,
        organizationId: 'org-1',
      }
      setupAgentStreamMocks(agent)
      mockProxyToChannelStream.mockResolvedValue({
        ok: true,
        body: createSSEBody(['data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n', 'data: [DONE]\n\n']),
      })

      const events: Array<{ type: string, content?: string, message?: string }> = []
      for await (const event of streamAgentMessage('agent-1', 'user-1', 'hello')) {
        events.push(event)
      }

      expect(events[0]).toMatchObject({ type: 'start', conversationId: 'conv-1' })
      expect(events.some(event => event.type === 'delta' && event.content === 'Hi')).toBe(true)
      expect(events.at(-1)).toMatchObject({ type: 'done', message: 'Hi' })
      expect(mockProxyToChannelStream).toHaveBeenCalledTimes(1)
    })

    it('should execute model-requested tools before streaming the final answer', async () => {
      const agent = {
        id: 'agent-1',
        name: 'Bot',
        model: 'gpt-4o',
        systemPrompt: 'Be helpful',
        temperature: 30,
        maxTokens: 4096,
        organizationId: 'org-1',
        ragEnabled: true,
        ragCallMode: 'auto',
      }
      mockLoadAgentBindings.mockResolvedValue({
        knowledgeBases: [{ id: 'kb-1', name: 'Docs', enabled: true, topK: 5 }],
        tools: [],
        skills: [],
      })
      mockSearchKnowledgeBase.mockResolvedValue([
        { id: 'chunk-1', documentId: 'doc-1', sort: 1, content: 'Pricing context', score: 0.91 },
      ])
      setupAgentStreamMocks(agent)
      mockProxyToChannel.mockResolvedValue({
        status: 200,
        body: JSON.stringify({
          choices: [{
            message: {
              content: '',
              tool_calls: [{
                id: 'call-1',
                type: 'function',
                function: { name: 'search_kb_kb-1', arguments: JSON.stringify({ query: 'pricing', topK: 2 }) },
              }],
            },
          }],
          usage: { total_tokens: 7 },
        }),
        headers: {},
        latency: 20,
      })
      mockProxyToChannelStream.mockResolvedValue({
        ok: true,
        body: createSSEBody(['data: {"choices":[{"delta":{"content":"Pricing answer"}}]}\n\n', 'data: [DONE]\n\n']),
      })

      const events: Array<{ type: string, content?: string, message?: string, toolSteps?: unknown[] }> = []
      for await (const event of streamAgentMessage('agent-1', 'user-1', 'hello')) {
        events.push(event)
      }

      expect(mockProxyToChannel).toHaveBeenCalledTimes(1)
      expect((mockProxyToChannel.mock.calls[0]![4] as Record<string, unknown>).tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            function: expect.objectContaining({ name: 'search_kb_kb-1' }),
          }),
        ]),
      )
      expect(mockSearchKnowledgeBase).toHaveBeenCalledWith('kb-1', 'pricing', 2)
      expect((mockProxyToChannelStream.mock.calls[0]![4] as { messages: Array<{ role: string }> }).messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'tool' }),
        ]),
      )
      expect(events.some(event => event.type === 'delta' && event.content === 'Pricing answer')).toBe(true)
      expect(events.at(-1)).toMatchObject({
        type: 'done',
        message: 'Pricing answer',
        toolSteps: expect.arrayContaining([
          expect.objectContaining({ toolId: 'search_kb_kb-1', status: 'called' }),
        ]),
      })
    })

    it('should throw 404 when agent is missing', async () => {
      mockSelect.mockReturnValue(createAgentSelectChain([]))

      const iterator = streamAgentMessage('missing', 'user-1', 'hello')
      await expect(iterator.next()).rejects.toMatchObject({
        statusCode: 404,
        message: 'Agent not found',
      })
    })
  })
})
