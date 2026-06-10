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
    vi.clearAllMocks()
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

      const events: Array<{ type: string; content?: string; message?: string }> = []
      for await (const event of streamAgentMessage('agent-1', 'user-1', 'hello')) {
        events.push(event)
      }

      expect(events[0]).toMatchObject({ type: 'start', conversationId: 'conv-1' })
      expect(events.some(event => event.type === 'delta' && event.content === 'Hi')).toBe(true)
      expect(events.at(-1)).toMatchObject({ type: 'done', message: 'Hi' })
      expect(mockProxyToChannelStream).toHaveBeenCalledTimes(1)
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
