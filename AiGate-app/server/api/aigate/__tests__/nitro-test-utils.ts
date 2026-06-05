import { expect } from 'vitest'
import { RESPONSE_CODE } from '@/enums'

export interface MockEventOptions {
  context?: Record<string, unknown>
  query?: Record<string, string | undefined>
  body?: unknown
  params?: Record<string, string>
}

export function createMockEvent(options: MockEventOptions = {}) {
  return {
    context: options.context ?? {},
    node: { req: { url: '/' } },
    _query: options.query ?? {},
    _body: options.body,
    _params: options.params ?? {},
  }
}

export function expectForbidden(response: { code: number, msg: string }) {
  expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
  expect(response.msg).toBe('仅管理员可执行此操作')
}
