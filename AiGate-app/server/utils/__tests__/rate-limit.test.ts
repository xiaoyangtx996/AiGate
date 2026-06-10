import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from '../rate-limit'

describe('rateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should allow requests within limit', () => {
    const result = limiter.check('test-key-1', 5, 60000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('should block requests exceeding limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('test-key-2', 5, 60000)
    }
    const result = limiter.check('test-key-2', 5, 60000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should cleanup expired entries', () => {
    vi.useFakeTimers()
    // 使用较短的窗口时间（100ms）
    limiter.check('key1', 2, 100)
    // 验证初始状态
    expect(limiter.getStats().totalKeys).toBe(1)
    // 推进时间超过窗口期
    vi.advanceTimersByTime(200)
    limiter.cleanup()
    // 验证已清理
    expect(limiter.getStats().totalKeys).toBe(0)
    expect(limiter.getStats().totalRequests).toBe(0)
  })

  it('should track stats', () => {
    limiter.check('key1', 2, 60000)
    limiter.check('key2', 2, 60000)
    const stats = limiter.getStats()
    expect(stats.totalKeys).toBe(2)
    expect(stats.totalRequests).toBe(2)
  })

  it('should reset after window expires', () => {
    const result1 = limiter.check('test-key-3', 1, 1)
    expect(result1.allowed).toBe(true)
  })
})
