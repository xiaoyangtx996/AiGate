import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import promptRenderHandler from '../prompt/[id]/render.post'
import promptRunHandler from '../prompt/[id]/run.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockSelectChannel = vi.fn()
const mockProxyToChannel = vi.fn()
const mockProxyToChannelStream = vi.fn()
const mockConsumeQuota = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
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
    latency: 'latency',
    statusCode: 'statusCode',
    status: 'status',
    prompt: 'prompt',
    response: 'response',
  },
  prompt: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    content: 'content',
    variables: 'variables',
  },
}))

vi.mock('#server/utils/gateway', () => ({
  selectChannel: (...args: unknown[]) => mockSelectChannel(...args),
  proxyToChannel: (...args: unknown[]) => mockProxyToChannel(...args),
  proxyToChannelStream: (...args: unknown[]) => mockProxyToChannelStream(...args),
}))

vi.mock('#server/utils/quota', () => ({
  consumeQuota: (...args: unknown[]) => mockConsumeQuota(...args),
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createInsertExecuteChain() {
  return {
    values: vi.fn().mockReturnValue({
      execute: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

describe('aigate prompt sandbox handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject render when required variables are missing', async () => {
    mockSelect.mockReturnValue(createSelectChain([{
      id: 'prompt-1',
      name: 'Greeting',
      organizationId: 'org-1',
      content: 'Hello {{name}}',
      variables: [{ name: 'name', required: true }],
    }]))

    const response = await promptRenderHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'prompt-1' },
        body: { values: {} },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(response.msg).toBe('Missing required prompt variables')
    expect(response.data).toEqual({ missing: ['name'] })
  })

  it('should render prompt using declared default values', async () => {
    mockSelect.mockReturnValue(createSelectChain([{
      id: 'prompt-1',
      name: 'Greeting',
      organizationId: 'org-1',
      content: 'Hello {{name}} in {{language}}',
      variables: [
        { name: 'name', required: true },
        { name: 'language', required: false, defaultValue: 'TypeScript' },
      ],
    }]))

    const response = await promptRenderHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'prompt-1' },
        body: { values: { name: 'Alice' } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data?.rendered).toBe('Hello Alice in TypeScript')
    expect(response.data?.values).toEqual({ name: 'Alice', language: 'TypeScript' })
  })

  it('should run prompt sandbox and write api log', async () => {
    mockSelect.mockReturnValue(createSelectChain([{
      id: 'prompt-1',
      name: 'Greeting',
      organizationId: 'org-1',
      content: 'Hello {{name}}',
      variables: [{ name: 'name', required: true }],
    }]))
    mockSelectChannel.mockResolvedValue({ id: 'channel-1', vendor: 'OpenAI' })
    mockProxyToChannel.mockResolvedValue({
      status: 200,
      body: JSON.stringify({
        choices: [{ message: { content: 'Hi Alice' } }],
        usage: { total_tokens: 11 },
      }),
    })
    const insertChain = createInsertExecuteChain()
    mockInsert.mockReturnValue(insertChain)

    const response = await promptRunHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'prompt-1' },
        body: { values: { name: 'Alice' }, model: 'gpt-4o-mini', temperature: 0.2 },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toMatchObject({
      rendered: 'Hello Alice',
      message: 'Hi Alice',
      model: 'gpt-4o-mini',
      usage: { total_tokens: 11 },
    })
    expect(mockProxyToChannel).toHaveBeenCalledWith(
      { id: 'channel-1', vendor: 'OpenAI' },
      'v1/chat/completions',
      'POST',
      { 'Content-Type': 'application/json' },
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello Alice' }],
        temperature: 0.2,
        stream: false,
      }),
    )
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({
      type: 'prompt_sandbox',
      totalTokens: 11,
      prompt: 'Hello Alice',
      response: 'Hi Alice',
    }))
    expect(mockConsumeQuota).toHaveBeenCalledWith('org-1', 11)
  })
})
