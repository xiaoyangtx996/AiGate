import { describe, expect, it } from 'vitest'
import { getRedisClient, redisDel, redisGetJson, redisIncrWithExpire, redisSetJson } from '../redis'

describe('redis utils', () => {
  it('should disable redis helpers when REDIS_URL is not configured', async () => {
    const original = process.env.REDIS_URL
    delete process.env.REDIS_URL

    expect(getRedisClient()).toBeNull()
    await expect(redisIncrWithExpire('test', 1)).resolves.toBeNull()
    await expect(redisGetJson('test')).resolves.toBeNull()
    await expect(redisSetJson('test', { ok: true }, 1)).resolves.toBe(false)
    await expect(redisDel('test')).resolves.toBe(false)

    process.env.REDIS_URL = original
  })
})
