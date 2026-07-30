type RequestOptions = NonNullable<Parameters<typeof $fetch>[1]>
type RequestBody = RequestOptions['body']

interface MutationOptions extends RequestOptions {
  invalidates?: string[]
}

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
const RESOURCE_ID_RE = /\/[^/?#]+$/

function isCacheConfig(value: unknown): value is CacheConfig {
  return typeof value === 'object' && value !== null && 'staleTime' in value
}

function buildCacheKey(url: string, params?: Record<string, unknown>) {
  return `${url}?${JSON.stringify(params ?? {})}`
}

function getCacheEntry<T>(key: string): { data: T, isStale: boolean } | null {
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

function getResourcePrefix(url: string) {
  return url.replace(RESOURCE_ID_RE, '')
}

export function invalidateCache(prefix: string) {
  if (!prefix) {
    responseCache.clear()
    return
  }

  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix))
      responseCache.delete(key)
  }
}

function extractRequestOptions(options?: MutationOptions): RequestOptions | undefined {
  if (!options)
    return undefined
  const { invalidates: _invalidates, ...requestOptions } = options
  return requestOptions
}

function invalidateMutationCache(url: string, options?: MutationOptions) {
  invalidateCache(getResourcePrefix(url))
  for (const prefix of options?.invalidates ?? []) {
    invalidateCache(prefix)
  }
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
    }
    else {
      options = cacheOrOptions
    }

    const cacheKey = cacheConfig ? buildCacheKey(url, params) : null

    if (cacheKey && cacheConfig) {
      const cached = getCacheEntry<IResponse<T>>(cacheKey)
      if (cached) {
        if (cached.isStale) {
          request<T>(url, { method: 'GET', params, ...options })
            .then((data) => {
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
  const post = async <T = unknown>(url: string, body?: unknown, options?: MutationOptions) => {
    const result = await request<T>(url, {
      method: 'POST',
      body: body as RequestBody,
      ...extractRequestOptions(options),
    })
    invalidateMutationCache(url, options)
    return result
  }

  /**
   * @description: PUT 请求
   */
  const put = async <T = unknown>(url: string, body?: unknown, options?: MutationOptions) => {
    const result = await request<T>(url, {
      method: 'PUT',
      body: body as RequestBody,
      ...extractRequestOptions(options),
    })
    invalidateMutationCache(url, options)
    return result
  }

  /**
   * @description: DELETE 请求
   */
  const del = async <T = unknown>(url: string, params?: Record<string, unknown>, options?: MutationOptions) => {
    const result = await request<T>(url, {
      method: 'DELETE',
      params,
      ...extractRequestOptions(options),
    })
    invalidateMutationCache(url, options)
    return result
  }

  return {
    request,
    get,
    post,
    put,
    del,
    invalidateCache,
  }
}
