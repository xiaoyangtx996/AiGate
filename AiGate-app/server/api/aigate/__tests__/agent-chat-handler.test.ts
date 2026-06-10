import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import agentChatHandler from '../agent/[id]/chat.post'

import { asResponse, createMockEvent } from './nitro-test-utils'

interface ChatSuccessData {
  conversationId: string
  message: string
  latency: number
  usage: { total_tokens: number }
}

interface ErrorData {
  statusCode: number
  message: string
}

const mockSendAgentMessage = vi.fn()
const mockStreamAgentMessage = vi.fn()
const mockSetResponseHeaders = vi.fn()

vi.mock('#server/utils/agent-chat', () => ({
  sendAgentMessage: (...args: unknown[]) => mockSendAgentMessage(...args),
  streamAgentMessage: (...args: unknown[]) => mockStreamAgentMessage(...args),
}))

vi.stubGlobal('setResponseHeaders', (...args: unknown[]) => mockSetResponseHeaders(...args))

function createStreamGenerator(chunks: unknown[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk
    }
  })()
}

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

describe('aigate agent chat handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSendAgentMessage.mockResolvedValue({
      conversationId: 'conv-1',
      message: 'Hello!',
      latency: 120,
      usage: { total_tokens: 10 },
    })
    mockStreamAgentMessage.mockReturnValue(createStreamGenerator([
      { type: 'start', conversationId: 'conv-1' },
      { type: 'delta', content: 'Hi' },
      { type: 'done', conversationId: 'conv-1', message: 'Hi', latency: 80 },
    ]))
  })

  it('should return 401 when user is not authenticated', async () => {
    const response = asResponse<ErrorData>(await agentChatHandler(createMockEvent({
      params: { id: 'agent-1' },
      body: { message: 'hello' },
    })))

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
    expect(response.data).toMatchObject({ statusCode: 401, message: 'Unauthorized' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
    expect(mockStreamAgentMessage).not.toHaveBeenCalled()
  })

  it('should return 403 when non-admin user has no organization context', async () => {
    const response = asResponse<ErrorData>(await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: null } },
      params: { id: 'agent-1' },
      body: { message: 'hello' },
    })))

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(response.data).toMatchObject({ statusCode: 403, message: '当前账号缺少组织上下文' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
    expect(mockStreamAgentMessage).not.toHaveBeenCalled()
  })

  it('should return 400 when agent id is missing', async () => {
    const response = asResponse<ErrorData>(await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      body: { message: 'hello' },
    })))

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(response.data).toMatchObject({ statusCode: 400, message: 'Missing agent ID' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
  })

  it('should return 400 when message is missing', async () => {
    const response = asResponse<ErrorData>(await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'agent-1' },
      body: {},
    })))

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(response.data).toMatchObject({ statusCode: 400, message: 'Missing message' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
  })

  it('should return success response for non-stream requests', async () => {
    const response = asResponse<ChatSuccessData>(await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', conversationId: 'conv-existing' },
    })))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({
      conversationId: 'conv-1',
      message: 'Hello!',
      latency: 120,
      usage: { total_tokens: 10 },
    })
    expect(mockSendAgentMessage).toHaveBeenCalledWith('agent-1', 'user-1', 'hello', 'conv-existing', {
      isAdmin: undefined,
      organizationId: 'org-1',
    })
  })

  it('should set SSE headers and return a stream for stream requests', async () => {
    const event = createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    })

    const response = await agentChatHandler(event)

    expect(mockSetResponseHeaders).toHaveBeenCalledWith(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    expect(response).toBeInstanceOf(ReadableStream)
    expect(mockStreamAgentMessage).toHaveBeenCalledWith('agent-1', 'user-1', 'hello', undefined, {
      isAdmin: undefined,
      organizationId: 'org-1',
    })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
  })

  it('should write SSE chunks and DONE marker during stream', async () => {
    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    })) as ReadableStream<Uint8Array>

    expect(await readStream(response)).toBe([
      'data: {"type":"start","conversationId":"conv-1"}\n\n',
      'data: {"type":"delta","content":"Hi"}\n\n',
      'data: {"type":"done","conversationId":"conv-1","message":"Hi","latency":80}\n\n',
      'data: [DONE]\n\n',
    ].join(''))
  })

  it('should return responseError when sendAgentMessage fails', async () => {
    mockSendAgentMessage.mockRejectedValue(new Error('Agent not found'))

    const response = asResponse<Error>(await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'missing' },
      body: { message: 'hello' },
    })))

    expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
    expect(response.data).toBeInstanceOf(Error)
    expect((response.data as Error).message).toBe('Agent not found')
  })

  it('should write stream error payload when streamAgentMessage fails', async () => {
    mockStreamAgentMessage.mockReturnValue((async function* () {
      throw new Error('Stream failed')
    })())

    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    })) as ReadableStream<Uint8Array>

    expect(await readStream(response)).toContain('data: {"type":"error","message":"Stream failed"}\n\n')
  })

  it('should use fallback stream error message when error has no message', async () => {
    mockStreamAgentMessage.mockReturnValue((async function* () {
      const error = new Error('empty message placeholder')
      Object.defineProperty(error, 'message', { value: '' })
      throw error
    })())

    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    })) as ReadableStream<Uint8Array>

    expect(await readStream(response)).toContain('data: {"type":"error","message":"Stream failed"}\n\n')
  })
})
