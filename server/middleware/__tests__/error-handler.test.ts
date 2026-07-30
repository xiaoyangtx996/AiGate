import { beforeEach, describe, expect, it, vi } from 'vitest'
import { syncErrorResponseStatus } from '#server/utils/error-response-status'

const { setResponseStatus } = vi.hoisted(() => ({
  setResponseStatus: vi.fn(),
}))

vi.stubGlobal('setResponseStatus', setResponseStatus)

describe('error-handler plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should map error response body code to HTTP status', () => {
    const event = {} as never

    syncErrorResponseStatus(event, {
      body: {
        code: 404,
        msg: '资源不存在',
        timestamp: Date.now(),
      },
    })

    expect(setResponseStatus).toHaveBeenCalledWith(event, 404)
  })

  it('should ignore success and non-standard response bodies', () => {
    syncErrorResponseStatus(
      {} as never,
      {
        body: {
          code: 200,
          msg: '请求成功',
          timestamp: Date.now(),
        },
      },
    )
    syncErrorResponseStatus({} as never, { body: { code: 404, msg: 'missing timestamp' } })
    syncErrorResponseStatus({} as never, { body: null })
    syncErrorResponseStatus({} as never, undefined)

    expect(setResponseStatus).not.toHaveBeenCalled()
  })
})
