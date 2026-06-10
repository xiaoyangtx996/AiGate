import type { EventHandlerRequest, H3Event } from 'h3'
import type { IResponse } from '../../../../shared/types/api'
import { expect } from 'vitest'
import { RESPONSE_CODE } from '@/enums'

export interface MockEventOptions {
  context?: Record<string, unknown>
  query?: Record<string, string | undefined>
  body?: unknown
  params?: Record<string, string>
  _formData?: unknown
}

export function createMockEvent(options: MockEventOptions = {}): H3Event<EventHandlerRequest> {
  return {
    context: options.context ?? {},
    node: { req: { url: '/' } },
    _query: options.query ?? {},
    _body: options.body,
    _params: options.params ?? {},
    _formData: options._formData,
  } as unknown as H3Event<EventHandlerRequest>
}

export function asResponse<T = unknown>(response: unknown): IResponse<T> {
  return response as IResponse<T>
}

export function expectForbidden(response: { code: string | number; msg: string }) {
  expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
  expect(response.msg).toBe('仅管理员可执行此操作')
}
