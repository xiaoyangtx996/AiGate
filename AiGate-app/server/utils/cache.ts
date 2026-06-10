const cacheStore = new Map<string, { data: unknown, expiresAt: number }>()

/** 从内存缓存读取，过期则自动清除 */
export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry)
    return null
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return null
  }
  return entry.data as T
}

/** 写入内存缓存，ttlMs 为存活毫秒数 */
export function setCached(key: string, data: unknown, ttlMs: number): void {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs })
}

/** 拼接缓存键 */
export function createCacheKey(...parts: (string | number | null | undefined)[]): string {
  return parts.map(p => String(p ?? 'null')).join(':')
}
