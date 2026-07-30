import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import botChatHandler from '../bot/chat.post'
import botConversationsHandler from '../bot/conversations.get'

import { asResponse, createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockPickBotTool = vi.fn()
const mockRunBotTool = vi.fn()
const mockConsumeQuota = vi.fn()
const mockGetSetting = vi.fn()
const mockSetResponseHeaders = vi.fn()
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
  apiLog: {
    userId: 'userId',
    organizationId: 'organizationId',
    model: 'model',
    provider: 'provider',
    type: 'type',
    totalTokens: 'totalTokens',
    status: 'status',
    prompt: 'prompt',
    response: 'response',
  },
  conversation: {
    id: 'id',
    agentId: 'agentId',
    userId: 'userId',
    title: 'title',
    type: 'type',
    messageCount: 'messageCount',
    updatedAt: 'updatedAt',
  },
  conversationMessage: {
    conversationId: 'conversationId',
    role: 'role',
    content: 'content',
    tokens: 'tokens',
    metadata: 'metadata',
    createdAt: 'createdAt',
  },
}))

vi.mock('#server/utils/aigate-bot', () => ({
  AIGATE_BOT_ID: 'aigate-bot',
  BOT_TOOL_DEFINITIONS: [{ type: 'function', function: { name: 'query_token_usage', parameters: { type: 'object', properties: {} } } }],
  buildBotSystemPrompt: () => 'bot system prompt',
  parseBotToolArguments: (input: unknown) => (typeof input === 'string' ? JSON.parse(input) : input || {}),
  pickBotTool: (...args: unknown[]) => mockPickBotTool(...args),
  runBotTool: (...args: unknown[]) => mockRunBotTool(...args),
}))

vi.mock('#server/utils/quota', () => ({
  consumeQuota: (...args: unknown[]) => mockConsumeQuota(...args),
}))

vi.mock('#server/utils/gateway', () => ({
  selectChannel: (...args: unknown[]) => mockSelectChannel(...args),
  proxyToChannel: (...args: unknown[]) => mockProxyToChannel(...args),
  proxyToChannelStream: (...args: unknown[]) => mockProxyToChannelStream(...args),
}))

vi.mock('#server/utils/system-settings', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}))

vi.stubGlobal('setResponseHeaders', (...args: unknown[]) => mockSetResponseHeaders(...args))

async function readStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    text += decoder.decode(value, { stream: true })
  }
  return text
}

function createSelectLimitChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createConversationListChain(result: unknown[]) {
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

function createMessageHistoryChain(result: unknown[]) {
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

function createInsertReturningChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createInsertValuesChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  }
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

describe('aigate bot handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPickBotTool.mockReturnValue('query_token_usage')
    mockRunBotTool.mockResolvedValue({
      restricted: false,
      rows: [{ organizationId: 'org-1', model: 'gpt-4o', tokens: 120 }],
    })
    mockConsumeQuota.mockResolvedValue(undefined)
    mockGetSetting.mockResolvedValue('gpt-4o-mini')
    mockSelectChannel.mockResolvedValue(null)
  })

  it('should reject bot chat when user is not authenticated', async () => {
    const response = await botChatHandler(createMockEvent({ body: { message: 'usage' } }))

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should create a bot conversation and persist user and assistant messages', async () => {
    const conversationInsert = createInsertReturningChain([{ id: 'conv-1' }])
    mockInsert
      .mockReturnValueOnce(conversationInsert)
      .mockReturnValueOnce(createInsertValuesChain())
      .mockReturnValueOnce(createInsertValuesChain())
    mockUpdate.mockReturnValue(createUpdateChain())

    const response = asResponse<any>(
      await botChatHandler(
        createMockEvent({
          context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
          body: { message: 'show token usage' },
        }),
      ),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data?.conversationId).toBe('conv-1')
    expect(response.data?.message).toContain('Token usage')
    expect(conversationInsert.values).toHaveBeenCalledWith({
      agentId: null,
      userId: 'user-1',
      title: 'show token usage',
      type: 'bot',
    })
    expect(mockInsert).toHaveBeenCalledTimes(3)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockConsumeQuota).toHaveBeenCalledWith('org-1', expect.any(Number))
    expect(mockGetSetting).toHaveBeenCalledWith('bot.modelId', 'org-1')
    expect(mockRunBotTool).toHaveBeenCalledWith(
      'query_token_usage',
      { userId: 'user-1', organizationId: 'org-1' },
      { days: 30, limit: 5 },
    )
  })

  it('should let the configured model call bot tools before producing the final answer', async () => {
    mockSelectChannel.mockResolvedValue({ id: 'channel-1', vendor: 'OpenAI' })
    mockProxyToChannel
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({
          choices: [{
            message: {
              role: 'assistant',
              tool_calls: [{
                id: 'tool-call-1',
                type: 'function',
                function: { name: 'query_token_usage', arguments: '{"days":7,"limit":3}' },
              }],
            },
          }],
          usage: { total_tokens: 12 },
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        body: JSON.stringify({
          choices: [{ message: { role: 'assistant', content: 'Top usage is org-1 with 120 tokens.' } }],
          usage: { total_tokens: 18 },
        }),
      })
    mockInsert
      .mockReturnValueOnce(createInsertReturningChain([{ id: 'conv-model' }]))
      .mockReturnValueOnce(createInsertValuesChain())
      .mockReturnValueOnce(createInsertValuesChain())
    mockSelect.mockReturnValueOnce(createMessageHistoryChain([]))
    mockUpdate.mockReturnValue(createUpdateChain())

    const response = asResponse<any>(
      await botChatHandler(
        createMockEvent({
          context: { principal: { userId: 'user-1', organizationId: 'org-1', isAdmin: true } },
          body: { message: 'show token usage' },
        }),
      ),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data?.message).toBe('Top usage is org-1 with 120 tokens.')
    expect(mockProxyToChannel).toHaveBeenCalledTimes(2)
    expect(mockRunBotTool).toHaveBeenCalledWith(
      'query_token_usage',
      { userId: 'user-1', organizationId: 'org-1', isAdmin: true },
      { days: 7, limit: 3 },
    )
    expect(response.data?.toolSteps).toEqual([
      expect.objectContaining({ name: 'query_token_usage', status: 'called' }),
    ])
  })

  it('should stream bot response events for stream requests', async () => {
    mockInsert
      .mockReturnValueOnce(createInsertReturningChain([{ id: 'conv-stream' }]))
      .mockReturnValueOnce(createInsertValuesChain())
      .mockReturnValueOnce(createInsertValuesChain())
    mockUpdate.mockReturnValue(createUpdateChain())

    const event = createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      body: { message: 'usage', stream: true },
    })
    const response = (await botChatHandler(event)) as ReadableStream<Uint8Array>

    expect(mockSetResponseHeaders).toHaveBeenCalledWith(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    const text = await readStream(response)
    expect(text).toContain('"type":"start","conversationId":"conv-stream"')
    expect(text).toContain('"type":"delta","content":"Token usage')
    expect(text).toContain('"type":"done","conversationId":"conv-stream"')
    expect(text).toContain('data: [DONE]')
  })

  it('should start a new bot conversation when provided conversation belongs to another agent', async () => {
    mockSelect.mockReturnValueOnce(createSelectLimitChain([{ id: 'conv-agent', userId: 'user-1', agentId: 'agent-1', type: 'agent' }]))
    mockInsert
      .mockReturnValueOnce(createInsertReturningChain([{ id: 'conv-bot' }]))
      .mockReturnValueOnce(createInsertValuesChain())
      .mockReturnValueOnce(createInsertValuesChain())
    mockUpdate.mockReturnValue(createUpdateChain())

    const response = asResponse<any>(
      await botChatHandler(
        createMockEvent({
          context: { principal: { userId: 'user-1' } },
          body: { message: 'usage', conversationId: 'conv-agent' },
        }),
      ),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data?.conversationId).toBe('conv-bot')
  })

  it('should return current user bot conversations with messages', async () => {
    const updatedAt = new Date('2026-06-10T00:00:00Z')
    mockSelect
      .mockReturnValueOnce(
        createConversationListChain([
          { id: 'conv-1', agentId: null, type: 'bot', title: 'Usage', updatedAt },
        ]),
      )
      .mockReturnValueOnce(
        createConversationListChain([
          {
            role: 'user',
            content: 'usage',
            createdAt: updatedAt,
            metadata: {},
          },
          {
            role: 'assistant',
            content: 'Token usage',
            createdAt: updatedAt,
            metadata: { toolSteps: [{ name: 'query_token_usage' }] },
          },
        ]),
      )

    const response = asResponse<any>(
      await botConversationsHandler(
        createMockEvent({
          context: { principal: { userId: 'user-1' } },
        }),
      ),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([
      {
        id: 'conv-1',
        agentId: 'aigate-bot',
        title: 'Usage',
        lastMessage: 'Token usage',
        updatedAt,
        messages: [
          { role: 'user', content: 'usage', time: updatedAt, toolSteps: [] },
          {
            role: 'assistant',
            content: 'Token usage',
            time: updatedAt,
            toolSteps: [{ name: 'query_token_usage' }],
          },
        ],
      },
    ])
  })
})
