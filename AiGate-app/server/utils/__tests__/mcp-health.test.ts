import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkAllChannels, checkChannelHealth } from '../mcp-health'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  channel: { id: 'id', status: 'status' },
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
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

const sampleChannel = {
  id: 'ch-1',
  name: 'OpenAI Proxy',
  endpoint: 'https://api.example.com/v1/',
  status: 'enabled',
}

describe('mcp-health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue(createUpdateChain())
  })

  describe('checkChannelHealth', () => {
    it('should return not-found result when channel is missing', async () => {
      mockSelect.mockReturnValueOnce(createSelectChain([]))

      const result = await checkChannelHealth('missing-id')

      expect(result).toMatchObject({
        channelId: 'missing-id',
        healthy: false,
        error: 'Channel not found',
      })
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should mark channel healthy when endpoint responds with status < 500', async () => {
      mockSelect.mockReturnValueOnce(createSelectChain([sampleChannel]))
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))

      const result = await checkChannelHealth('ch-1')

      expect(result.healthy).toBe(true)
      expect(result.name).toBe('OpenAI Proxy')
      expect(result.endpoint).toBe(sampleChannel.endpoint)
      expect(typeof result.latency).toBe('number')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/models',
        expect.objectContaining({ method: 'GET' }),
      )

      vi.unstubAllGlobals()
    })

    it('should mark channel unhealthy when endpoint returns 5xx', async () => {
      mockSelect.mockReturnValueOnce(createSelectChain([sampleChannel]))
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503 }))

      const result = await checkChannelHealth('ch-1')

      expect(result.healthy).toBe(false)
      expect(mockUpdate).toHaveBeenCalledTimes(1)

      vi.unstubAllGlobals()
    })

    it('should handle fetch errors and return down status', async () => {
      mockSelect.mockReturnValueOnce(createSelectChain([sampleChannel]))
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network timeout')))

      const result = await checkChannelHealth('ch-1')

      expect(result.healthy).toBe(false)
      expect(result.error).toBe('Network timeout')
      expect(mockUpdate).toHaveBeenCalledTimes(1)

      vi.unstubAllGlobals()
    })
  })

  describe('checkAllChannels', () => {
    it('should check all enabled channels', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain([
          { id: 'ch-1', name: 'A', endpoint: 'https://a.test/v1', status: 'enabled' },
          { id: 'ch-2', name: 'B', endpoint: 'https://b.test/v1', status: 'enabled' },
        ]))
        .mockReturnValueOnce(createSelectChain([{ ...sampleChannel, id: 'ch-1' }]))
        .mockReturnValueOnce(createSelectChain([{ ...sampleChannel, id: 'ch-2', name: 'B', endpoint: 'https://b.test/v1' }]))

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))

      const results = await checkAllChannels()

      expect(results).toHaveLength(2)
      expect(results.every(r => r.healthy)).toBe(true)

      vi.unstubAllGlobals()
    })
  })
})
