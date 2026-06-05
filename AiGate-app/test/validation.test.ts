import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('h3', () => ({
  defineEventHandler: (handler: (event: unknown) => unknown) => handler,
  readBody: async (event: { _body?: unknown }) => event._body ?? {},
  getQuery: (event: { _query?: Record<string, string | undefined> }) => event._query ?? {},
}))

import { validateBody, validateQuery, ValidationError } from '../server/utils/validation'
import { createMockEvent } from '../server/api/aigate/__tests__/nitro-test-utils'

const bodySchema = z.object({
  name: z.string(),
  age: z.number(),
})

const querySchema = z.object({
  page: z.coerce.number().min(1),
  pageSize: z.coerce.number().min(1).max(100).optional(),
})

describe('ValidationError', () => {
  it('should expose issues and use ValidationError name', () => {
    const result = bodySchema.safeParse({ name: 'test' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = new ValidationError(result.error.issues)
      expect(err.name).toBe('ValidationError')
      expect(err.message).toBe('Validation failed')
      expect(err.issues).toEqual(result.error.issues)
    }
  })
})

describe('validateBody', () => {
  it('should return parsed data for valid body', async () => {
    const handler = validateBody(bodySchema)
    const event = createMockEvent({ body: { name: 'Alice', age: 30 } })

    const data = await handler(event)

    expect(data).toEqual({ name: 'Alice', age: 30 })
    expect(event.context.body).toEqual({ name: 'Alice', age: 30 })
  })

  it('should throw ValidationError for invalid body', async () => {
    const handler = validateBody(bodySchema)
    const event = createMockEvent({ body: { name: 'Alice' } })

    await expect(handler(event)).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('validateQuery', () => {
  it('should return parsed query for valid params', async () => {
    const handler = validateQuery(querySchema)
    const event = createMockEvent({ query: { page: '2', pageSize: '20' } })

    const data = await handler(event)

    expect(data).toEqual({ page: 2, pageSize: 20 })
    expect(event.context.query).toEqual({ page: 2, pageSize: 20 })
  })

  it('should throw ValidationError for invalid query', async () => {
    const handler = validateQuery(querySchema)
    const event = createMockEvent({ query: { page: '0' } })

    await expect(handler(event)).rejects.toBeInstanceOf(ValidationError)
  })
})
