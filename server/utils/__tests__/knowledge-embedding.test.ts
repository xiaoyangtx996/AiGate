import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelectChannel = vi.fn()
const mockProxyToChannel = vi.fn()

vi.mock('#server/utils/gateway', () => ({
  selectChannel: (...args: unknown[]) => mockSelectChannel(...args),
  proxyToChannel: (...args: unknown[]) => mockProxyToChannel(...args),
}))

describe('knowledge embedding utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectChannel.mockResolvedValue({ id: 'ch-1', vendor: 'openai', modelName: 'text-embedding-3-small' })
  })

  it('should batch embedding requests in groups of 32', async () => {
    mockProxyToChannel.mockImplementation(async (_channel, _path, _method, _headers, body: { input?: string[] }) => {
      const input = body?.input || []
      return {
        status: 200,
        body: JSON.stringify({
          data: input.map((_, index) => ({ embedding: [index, index + 1] })),
        }),
      }
    })

    const { embedTextsViaGateway } = await import('../knowledge-embedding')
    const texts = Array.from({ length: 33 }, (_, index) => `text-${index}`)
    const vectors = await embedTextsViaGateway({
      organizationId: 'org-1',
      modelName: 'text-embedding-3-small',
      texts,
    })

    expect(mockProxyToChannel).toHaveBeenCalledTimes(2)
    expect(vectors).toHaveLength(33)
    expect(vectors[0]).toEqual([0, 1])
  })

  it('should probe embedding dimension from gateway response', async () => {
    mockProxyToChannel.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ data: [{ embedding: Array.from({ length: 1536 }, () => 0.1) }] }),
    })

    const { probeEmbeddingDim } = await import('../knowledge-embedding')
    await expect(probeEmbeddingDim('org-1', 'text-embedding-3-small')).resolves.toBe(1536)
  })

  it('should throw when embedding channel is unavailable', async () => {
    mockSelectChannel.mockResolvedValue(null)
    const { embedTextsViaGateway } = await import('../knowledge-embedding')

    await expect(embedTextsViaGateway({
      organizationId: 'org-1',
      modelName: 'text-embedding-3-small',
      texts: ['hello'],
    })).rejects.toThrow('无可用的 embedding 渠道')
  })
})
