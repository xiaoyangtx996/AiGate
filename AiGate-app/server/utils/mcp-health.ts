import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel } from '@/db/schema'

interface HealthResult {
  channelId: string
  name: string
  endpoint: string
  healthy: boolean
  latency: number
  error?: string
  checkedAt: string
}

const trailingSlashPattern = /\/$/

export async function checkChannelHealth(channelId: string): Promise<HealthResult> {
  const [ch] = await db.select().from(channel).where(eq(channel.id, channelId))
  if (!ch)
    return { channelId, name: '', endpoint: '', healthy: false, latency: 0, error: 'Channel not found', checkedAt: new Date().toISOString() }

  const startTime = Date.now()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(`${ch.endpoint.replace(trailingSlashPattern, '')}/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const latency = Date.now() - startTime
    const healthy = response.status < 500

    await db.update(channel).set({
      health: healthy ? 'healthy' : 'degraded',
      lastChecked: new Date(),
    } as any).where(eq(channel.id, channelId))

    return { channelId, name: ch.name, endpoint: ch.endpoint, healthy, latency, checkedAt: new Date().toISOString() }
  }
  catch (err: any) {
    const latency = Date.now() - startTime
    await db.update(channel).set({
      health: 'down',
      lastChecked: new Date(),
    } as any).where(eq(channel.id, channelId))
    return { channelId, name: ch.name, endpoint: ch.endpoint, healthy: false, latency, error: err.message, checkedAt: new Date().toISOString() }
  }
}

export async function checkAllChannels(): Promise<HealthResult[]> {
  const channels = await db.select().from(channel).where(eq(channel.status, 'enabled'))
  const results = await Promise.all(channels.map(ch => checkChannelHealth(ch.id)))
  return results
}
