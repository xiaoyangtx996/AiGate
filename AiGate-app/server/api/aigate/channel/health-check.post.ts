import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel } from '@/db/schema'

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
  const startTime = Date.now()

  try {
    const response = await fetch(ch.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ch.apiKey ? { Authorization: `Bearer ${ch.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: ch.models?.[0] || 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10,
      }),
      signal: AbortSignal.timeout(10000),
    })

    const latency = Date.now() - startTime
    const health = response.ok ? 'healthy' : 'degraded'

    await db.update(channel)
      .set({ health, updatedAt: new Date() })
      .where(eq(channel.id, ch.id))

    return {
      channelId: ch.id,
      name: ch.name,
      healthy: response.ok,
      status: response.status,
      latency,
      timestamp: new Date().toISOString(),
    }
  }
  catch (error) {
    await db.update(channel)
      .set({ health: 'down', updatedAt: new Date() })
      .where(eq(channel.id, ch.id))

    return {
      channelId: ch.id,
      name: ch.name,
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event).catch(() => ({}))
    const channelId = body?.channelId as string | undefined
    const principal = event.context.principal as { organizationId?: string | null } | undefined

    const conditions = []
    if (channelId) conditions.push(eq(channel.id, channelId))
    if (principal?.organizationId) conditions.push(eq(channel.organizationId, principal.organizationId))

    const channels = await db
      .select()
      .from(channel)
      .where(conditions.length ? and(...conditions) : undefined)

    if (channelId && channels.length === 0) {
      return responseSuccess(null, '渠道不存在或无权访问', 404)
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
