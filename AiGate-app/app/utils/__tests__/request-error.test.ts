import { describe, expect, it } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { getRequestErrorMessage, getResponseErrorMessage, isRequestErrorResponse, isUnauthorizedResponse, shouldRedirectUnauthorized } from '@/utils/request-error'

describe('request error helpers', () => {
  it('recognizes non-success business responses', () => {
    expect(isRequestErrorResponse({ code: RESPONSE_CODE.BAD_REQUEST, msg: '参数错误' })).toBe(true)
    expect(isRequestErrorResponse({ code: RESPONSE_CODE.SUCCESS, msg: 'ok' })).toBe(false)
  })

  it('keeps response messages and falls back when missing', () => {
    expect(getResponseErrorMessage({ code: RESPONSE_CODE.BAD_REQUEST, msg: '参数错误' }, '操作失败')).toBe('参数错误')
    expect(getResponseErrorMessage({ code: RESPONSE_CODE.BAD_REQUEST, msg: '' }, '操作失败')).toBe('操作失败')
  })

  it('detects unauthorized responses', () => {
    expect(isUnauthorizedResponse({ code: RESPONSE_CODE.UNAUTHORIZED })).toBe(true)
    expect(isUnauthorizedResponse({ code: RESPONSE_CODE.FORBIDDEN })).toBe(false)
  })

  it('redirects expired sessions outside auth pages only', () => {
    const response = { code: RESPONSE_CODE.UNAUTHORIZED }

    expect(shouldRedirectUnauthorized(response, true, '/aigate/agents')).toBe(true)
    expect(shouldRedirectUnauthorized(response, true, '/auth/sign-in')).toBe(false)
    expect(shouldRedirectUnauthorized(response, false, '/aigate/agents')).toBe(false)
  })

  it('normalizes request error messages', () => {
    expect(getRequestErrorMessage(new Error('network down'), '请求失败')).toBe('network down')
    expect(getRequestErrorMessage('timeout', '请求失败')).toBe('timeout')
    expect(getRequestErrorMessage(null, '请求失败')).toBe('请求失败')
  })
})
