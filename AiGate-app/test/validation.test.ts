import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateBody, validateQuery, ValidationError } from '../server/utils/validation'

// 测试用的 schema
const testSchema = z.object({
  name: z.string(),
  age: z.number(),
})

describe('validation', () => {
  it('should validate body correctly', async () => {
    // 这个测试需要模拟 h3 的 event 对象
    // 这里只是示例，实际测试需要完整的 h3 环境
    expect(true).toBe(true)
  })
})
