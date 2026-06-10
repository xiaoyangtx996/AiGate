import type { z, ZodError } from 'zod'
import { defineEventHandler, getQuery, readBody } from 'h3'

/**
 * 验证失败错误类
 */
export class ValidationError extends Error {
  constructor(public issues: ZodError['issues']) {
    super('Validation failed')
    this.name = 'ValidationError'
  }
}

/**
 * 验证请求体
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return defineEventHandler(async event => {
    const body = await readBody(event)
    const result = schema.safeParse(body)

    if (!result.success) {
      throw new ValidationError(result.error.issues)
    }

    // 将验证后的数据存储到 context
    event.context.body = result.data
    return result.data
  })
}

/**
 * 验证查询参数
 */
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return defineEventHandler(async event => {
    const query = getQuery(event)
    const result = schema.safeParse(query)

    if (!result.success) {
      throw new ValidationError(result.error.issues)
    }

    event.context.query = result.data
    return result.data
  })
}
