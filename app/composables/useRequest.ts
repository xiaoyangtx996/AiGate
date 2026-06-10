type RequestOptions = Parameters<typeof $fetch>[1]
type RequestBody = NonNullable<RequestOptions>['body']

export interface CacheConfig {
  staleTime: number
  gcTime?: number
}

interface CacheEntry<T> {
  data: T
  fetchedAt: number
  staleTime: number
  gcTime: number
}

const responseCache = new Map<string, CacheEntry<unknown>>()

function isCacheConfig(value: unknown): value is CacheConfig {
  return typeof value === 'object' && value !== null && 'staleTime' in value
}

function buildCacheKey(url: string, params?: Record<string, unknown>) {
  return `${url}?${JSON.stringify(params ?? {})}`
}

function getCacheEntry<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = responseCache.get(key)
  if (!entry) {
    return null
  }

  const age = Date.now() - entry.fetchedAt
  if (age > entry.gcTime) {
    responseCache.delete(key)
    return null
  }

  return {
    data: entry.data as T,
    isStale: age > entry.staleTime,
  }
}

function setCacheEntry<T>(key: string, data: T, config: CacheConfig) {
  responseCache.set(key, {
    data,
    fetchedAt: Date.now(),
    staleTime: config.staleTime,
    gcTime: config.gcTime ?? config.staleTime * 2,
  })
}

export function useRequest() {
  const { $request } = useNuxtApp()

  /**
   * 🔥 通用请求
   */
  const request = async <T = unknown>(url: string, options?: RequestOptions): Promise<IResponse<T>> => {
    return await $request<IResponse<T>>(url, options)
  }

  /**
   * @description: GET 请求（支持 SWR 风格 staleTime 缓存）
   */
  const get = async <T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    cacheOrOptions?: CacheConfig | RequestOptions,
    maybeOptions?: RequestOptions,
  ): Promise<IResponse<T>> => {
    let cacheConfig: CacheConfig | undefined
    let options: RequestOptions | undefined

    if (isCacheConfig(cacheOrOptions)) {
      cacheConfig = cacheOrOptions
      options = maybeOptions
    } else {
      options = cacheOrOptions
    }

    const cacheKey = cacheConfig ? buildCacheKey(url, params) : null

    if (cacheKey && cacheConfig) {
      const cached = getCacheEntry<IResponse<T>>(cacheKey)
      if (cached) {
        if (cached.isStale) {
          request<T>(url, { method: 'GET', params, ...options })
            .then(data => {
              setCacheEntry(cacheKey, data, cacheConfig!)
            })
            .catch(() => {})
        }
        return cached.data
      }
    }

    const result = await request<T>(url, {
      method: 'GET',
      params,
      ...options,
    })

    if (cacheKey && cacheConfig) {
      setCacheEntry(cacheKey, result, cacheConfig)
    }

    return result
  }

  /**
   * @description: POST 请求
   */
  const post = <T = unknown>(url: string, body?: unknown, options?: RequestOptions) => {
    return request<T>(url, {
      method: 'POST',
      body: body as RequestBody,
      ...options,
    })
  }

  /**
   * @description: PUT 请求
   */
  const put = <T = unknown>(url: string, body?: unknown, options?: RequestOptions) => {
    return request<T>(url, {
      method: 'PUT',
      body: body as RequestBody,
      ...options,
    })
  }

  /**
   * @description: DELETE 请求
   */
  const del = <T = unknown>(url: string, params?: Record<string, unknown>, options?: RequestOptions) => {
    return request<T>(url, {
      method: 'DELETE',
      params,
      ...options,
    })
  }

  return {
    request,
    get,
    post,
    put,
    del,
  }
}
