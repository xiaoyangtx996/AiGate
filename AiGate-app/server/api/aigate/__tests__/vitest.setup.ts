import { vi } from 'vitest'
import { responseError, responseSuccess } from '#server/utils/index'

vi.stubGlobal('defineEventHandler', (handler: (event: unknown) => unknown) => handler)
vi.stubGlobal('getQuery', (event: { _query?: Record<string, string | undefined> }) => event._query ?? {})
vi.stubGlobal('readBody', async (event: { _body?: unknown }) => event._body ?? {})
vi.stubGlobal('responseSuccess', responseSuccess)
vi.stubGlobal('responseError', responseError)
