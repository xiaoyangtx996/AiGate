import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSendAgentMessage = vi.fn()
const mockStreamAgentMessage = vi.fn()
const mockSendStream = vi.fn()
const mockSetResponseHeaders = vi.fn()

vi.mock('#server/utils/agent-chat', () => ({
  sendAgentMessage: (...args: unknown[]) => mockSendAgentMessage(...args),
  streamAgentMessage: (...args: unknown[]) => mockStreamAgentMessage(...args),
}))

vi.mock('h3', () => ({
  sendStream: (...args: unknown[]) => mockSendStream(...args),
}))

vi.stubGlobal('setResponseHeaders', (...args: unknown[]) => mockSetResponseHeaders(...args))

import agentChatHandler from '../agent/[id]/chat.post'

function createStreamGenerator(chunks: unknown[]) {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk
    }
  })()
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
    mockSendStream.mockImplementation(async (_event, callback) => {
      const stream = { write: vi.fn().mockResolvedValue(undefined) }
      await callback(stream)
      return stream
    })
  })

  it('should return 401 when user is not authenticated', async () => {
    const response = await agentChatHandler(createMockEvent({
      params: { id: 'agent-1' },
      body: { message: 'hello' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
    expect(response.data).toMatchObject({ statusCode: 401, message: 'Unauthorized' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
    expect(mockStreamAgentMessage).not.toHaveBeenCalled()
  })

  it('should return 400 when agent id is missing', async () => {
    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      body: { message: 'hello' },
    }))

    expect(response.data).toMatchObject({ statusCode: 400, message: 'Missing agent ID' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
  })

  it('should return 400 when message is missing', async () => {
    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'agent-1' },
      body: {},
    }))

    expect(response.data).toMatchObject({ statusCode: 400, message: 'Missing message' })
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
  })

  it('should return success response for non-stream requests', async () => {
    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', conversationId: 'conv-existing' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({
      conversationId: 'conv-1',
      message: 'Hello!',
      latency: 120,
      usage: { total_tokens: 10 },
    })
    expect(mockSendAgentMessage).toHaveBeenCalledWith('agent-1', 'user-1', 'hello', 'conv-existing')
    expect(mockSendStream).not.toHaveBeenCalled()
  })

  it('should set SSE headers and invoke sendStream for stream requests', async () => {
    const event = createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    })

    await agentChatHandler(event)

    expect(mockSetResponseHeaders).toHaveBeenCalledWith(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })
    expect(mockSendStream).toHaveBeenCalledTimes(1)
    expect(mockStreamAgentMessage).toHaveBeenCalledWith('agent-1', 'user-1', 'hello', undefined)
    expect(mockSendAgentMessage).not.toHaveBeenCalled()
  })

  it('should write SSE chunks and DONE marker during stream', async () => {
    const writes: string[] = []
    mockSendStream.mockImplementation(async (_event, callback) => {
      const stream = {
        write: vi.fn(async (data: string) => { writes.push(data) }),
      }
      await callback(stream)
      return stream
    })

    await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    }))

    expect(writes).toEqual([
      'data: {"type":"start","conversationId":"conv-1"}\n\n',
      'data: {"type":"delta","content":"Hi"}\n\n',
      'data: {"type":"done","conversationId":"conv-1","message":"Hi","latency":80}\n\n',
      'data: [DONE]\n\n',
    ])
  })

  it('should return responseError when sendAgentMessage fails', async () => {
    mockSendAgentMessage.mockRejectedValue(new Error('Agent not found'))

    const response = await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'missing' },
      body: { message: 'hello' },
    }))

    expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
    expect(response.data).toBeInstanceOf(Error)
    expect((response.data as Error).message).toBe('Agent not found')
  })

  it('should write stream error payload when streamAgentMessage fails', async () => {
    mockStreamAgentMessage.mockReturnValue((async function* () {
      throw new Error('Stream failed')
    })())

    const writes: string[] = []
    mockSendStream.mockImplementation(async (_event, callback) => {
      const stream = {
        write: vi.fn(async (data: string) => { writes.push(data) }),
      }
      await callback(stream)
      return stream
    })

    await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    }))

    expect(writes).toContain('data: {"type":"error","message":"Stream failed"}\n\n')
  })

  it('should use fallback stream error message when error has no message', async () => {
    mockStreamAgentMessage.mockReturnValue((async function* () {
      throw Object.assign(new Error(''), { message: '' })
    })())

    const writes: string[] = []
    mockSendStream.mockImplementation(async (_event, callback) => {
      const stream = {
        write: vi.fn(async (data: string) => { writes.push(data) }),
      }
      await callback(stream)
      return stream
    })

    await agentChatHandler(createMockEvent({
      context: { principal: { userId: 'user-1' } },
      params: { id: 'agent-1' },
      body: { message: 'hello', stream: true },
    }))

    expect(writes).toContain('data: {"type":"error","message":"Stream failed"}\n\n')
  })
})
