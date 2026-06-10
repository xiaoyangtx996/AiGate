import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createMockEvent } from '../../api/aigate/__tests__/nitro-test-utils'

import { validateBody, validateQuery, ValidationError } from '../validation'

vi.mock('h3', () => ({
  defineEventHandler: (handler: (event: unknown) => unknown) => handler,
  readBody: async (event: { _body?: unknown }) => event._body ?? {},
  getQuery: (event: { _query?: Record<string, string | undefined> }) => event._query ?? {},
}))

describe('validation utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validationError', () => {
    it('should expose zod issues and error name', () => {
      const result = z.object({ name: z.string() }).safeParse({ name: 123 })
      if (result.success) throw new Error('expected validation failure')

      const error = new ValidationError(result.error.issues)

      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Validation failed')
      expect(error.issues).toEqual(result.error.issues)
    })

    it('should be instanceof Error', () => {
      const result = z.object({ id: z.number() }).safeParse({ id: 'bad' })
      if (result.success) throw new Error('expected validation failure')

      expect(new ValidationError(result.error.issues)).toBeInstanceOf(Error)
    })
  })

  describe('validateBody', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
    })

    it('should parse valid body and store result on event context', async () => {
      const handler = validateBody(schema)
      const event = createMockEvent({ body: { name: 'alpha', count: 3 } })

      const result = await handler(event)

      expect(result).toEqual({ name: 'alpha', count: 3 })
      expect(event.context.body).toEqual({ name: 'alpha', count: 3 })
    })

    it('should throw ValidationError for invalid body', async () => {
      const handler = validateBody(schema)
      const event = createMockEvent({ body: { name: 123, count: 'bad' } })

      await expect(handler(event)).rejects.toBeInstanceOf(ValidationError)
      expect(event.context.body).toBeUndefined()
    })

    it('should reject missing required fields with issue paths', async () => {
      const handler = validateBody(schema)
      const event = createMockEvent({ body: { name: 'only-name' } })

      try {
        await handler(event)
        expect.unreachable('expected ValidationError')
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError)
        expect((err as ValidationError).issues.some(i => i.path.includes('count'))).toBe(true)
      }
    })

    it('should accept optional nested fields when schema allows', async () => {
      const nestedSchema = z.object({
        name: z.string(),
        meta: z.object({ tag: z.string() }).optional(),
      })
      const handler = validateBody(nestedSchema)
      const event = createMockEvent({ body: { name: 'beta', meta: { tag: 'v1' } } })

      const result = await handler(event)

      expect(result).toEqual({ name: 'beta', meta: { tag: 'v1' } })
    })
  })

  describe('validateQuery', () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1),
      keyword: z.string().optional(),
    })

    it('should parse valid query and store result on event context', async () => {
      const handler = validateQuery(schema)
      const event = createMockEvent({ query: { page: '2', keyword: 'gpt' } })

      const result = await handler(event)

      expect(result).toEqual({ page: 2, keyword: 'gpt' })
      expect(event.context.query).toEqual({ page: 2, keyword: 'gpt' })
    })

    it('should throw ValidationError for invalid query', async () => {
      const handler = validateQuery(schema)
      const event = createMockEvent({ query: { page: '0' } })

      await expect(handler(event)).rejects.toBeInstanceOf(ValidationError)
      expect(event.context.query).toBeUndefined()
    })

    it('should coerce numeric query strings', async () => {
      const handler = validateQuery(schema)
      const event = createMockEvent({ query: { page: '5' } })

      const result = await handler(event)

      expect(result.page).toBe(5)
      expect(typeof result.page).toBe('number')
    })

    it('should omit optional query fields when absent', async () => {
      const handler = validateQuery(schema)
      const event = createMockEvent({ query: { page: '1' } })

      const result = await handler(event)

      expect(result).toEqual({ page: 1 })
      expect('keyword' in result).toBe(false)
    })
  })
})
