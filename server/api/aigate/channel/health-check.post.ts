import { eq, inArray } from 'drizzle-orm'
import { testChannelCredential, updateChannelHealthFromCredentials } from '#server/utils/gateway-channel'
import { db } from '@/db/drizzle'
import { channel, channelCredential } from '@/db/schema'

interface ChannelHealthResult {
  channelId: string
  name: string
  healthy: boolean
  status?: number
  latency: number
  error?: string
  timestamp: string
}

async function checkOneChannel(ch: typeof channel.$inferSelect): Promise<ChannelHealthResult> {
  const credentials = await db.select().from(channelCredential).where(eq(channelCredential.channelId, ch.id))
  if (credentials.length === 0) {
    await db.update(channel).set({ health: 'down', updatedAt: new Date() }).where(eq(channel.id, ch.id))
    return {
      channelId: ch.id,
      name: ch.name,
      healthy: false,
      error: '渠道没有可用凭证',
      latency: 0,
      timestamp: new Date().toISOString(),
    }
  }

  const results = await Promise.all(credentials.map(item => testChannelCredential(ch, item)))
  const health = await updateChannelHealthFromCredentials(ch.id)
  const healthy = health !== 'down'
  const firstFailed = results.find(item => !item.healthy)
  const avgLatency = results.length
    ? Math.round(results.reduce((sum, item) => sum + item.latency, 0) / results.length)
    : 0

  return {
    channelId: ch.id,
    name: ch.name,
    healthy,
    status: firstFailed?.status ?? results[0]?.status,
    latency: avgLatency,
    error: firstFailed?.error,
    timestamp: new Date().toISOString(),
  }
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const body = await readBody(event).catch(() => ({}))
    const channelId = body?.channelId as string | undefined

    const channels = await db
      .select()
      .from(channel)
      .where(channelId ? eq(channel.id, channelId) : inArray(channel.status, ['enabled', 'disabled']))

    if (channelId && channels.length === 0) {
      return responseError(null, '渠道不存在或无权访问', { statusCode: 404 })
    }

    const results = await Promise.all(channels.map(checkOneChannel))

    if (channelId) {
      return responseSuccess(results[0] ?? null)
    }

    return responseSuccess({
      total: results.length,
      healthy: results.filter(item => item.healthy).length,
      unhealthy: results.filter(item => !item.healthy).length,
      results,
    })
  }
  catch (err) {
    return responseError(err)
  }
})
