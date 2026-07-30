import { z } from 'zod'

const optionalDate = z.preprocess(value => {
  if (value === '' || value === null || value === undefined) return null

  return new Date(String(value))
}, z.date().nullable())

export const myApiKeyCreateSchema = z.object({
  name: z.string().min(1),
  env: z.enum(['dev', 'staging', 'prod']).default('dev'),
  scopes: z.array(z.enum(['read', 'write'])).default(['read', 'write']),
  expiresAt: optionalDate.optional(),
  dailyLimit: z.number().int().positive().nullable().optional(),
  ipWhitelist: z.array(z.string().min(1)).default([]),
})

export const myApiKeyUpdateSchema = myApiKeyCreateSchema.partial().extend({
  status: z.enum(['active', 'revoked', 'disabled']).optional(),
})
