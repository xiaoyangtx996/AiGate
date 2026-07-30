import Redis from 'ioredis'

let client: Redis | null | undefined

export function getRedisClient() {
  if (!process.env.REDIS_URL)
    return null

  if (client !== undefined)
    return client

  client = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  })
  client.on('error', () => {
    client = null
  })
  return client
}

export async function redisIncrWithExpire(key: string, ttlSeconds: number) {
  const redis = getRedisClient()
  if (!redis)
    return null

  try {
    if (redis.status === 'wait')
      await redis.connect()

    const count = await redis.incr(key)
    if (count === 1)
      await redis.expire(key, ttlSeconds)
    const ttl = await redis.ttl(key)
    return { count, ttl: ttl > 0 ? ttl : ttlSeconds }
  }
  catch {
    return null
  }
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  if (!redis)
    return null

  try {
    if (redis.status === 'wait')
      await redis.connect()

    const raw = await redis.get(key)
    return raw ? JSON.parse(raw) as T : null
  }
  catch {
    return null
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds: number) {
  const redis = getRedisClient()
  if (!redis)
    return false

  try {
    if (redis.status === 'wait')
      await redis.connect()

    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return true
  }
  catch {
    return false
  }
}

export async function redisDel(key: string) {
  const redis = getRedisClient()
  if (!redis)
    return false

  try {
    if (redis.status === 'wait')
      await redis.connect()

    await redis.del(key)
    return true
  }
  catch {
    return false
  }
}
