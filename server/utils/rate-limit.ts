interface RateLimitEntry {
  count: number
  resetTime: number
  windowMs: number
}

/**
 * 增强的速率限制器
 * 支持自动清理过期记录
 */
export class RateLimiter {
  private requests = new Map<string, RateLimitEntry>()

  /**
   * 检查速率限制
   * @param key 限流键（如 API Key）
   * @param limit 时间窗口内最大请求数
   * @param windowMs 时间窗口（毫秒）
   */
  check(
    key: string,
    limit: number = 100,
    windowMs: number = 60000,
  ): {
    allowed: boolean
    remaining: number
    resetIn: number
  } {
    const now = Date.now()
    const entry = this.requests.get(key)

    // 如果没有记录或已过期，创建新记录
    if (!entry || now > entry.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs,
        windowMs,
      })
      return { allowed: true, remaining: limit - 1, resetIn: windowMs }
    }

    // 检查是否超限
    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetIn: entry.resetTime - now }
    }

    // 未超限，增加计数
    entry.count++
    return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now }
  }

  /**
   * 清理所有过期记录
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.requests) {
      if (now > entry.resetTime) {
        this.requests.delete(key)
      }
    }
  }

  /**
   * 获取当前使用情况（用于监控）
   */
  getStats(): { totalKeys: number; totalRequests: number } {
    let totalRequests = 0
    for (const entry of this.requests.values()) {
      totalRequests += entry.count
    }
    return {
      totalKeys: this.requests.size,
      totalRequests,
    }
  }
}

// 导出单例实例
export const rateLimiter = new RateLimiter()

// 定期清理（每小时，如果不在测试环境）
if (process.env.NODE_ENV !== 'test') {
  const cleanupTimer = setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000)
  cleanupTimer.unref()
}
