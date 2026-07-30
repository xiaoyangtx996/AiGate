import { and, asc, eq } from 'drizzle-orm'
import { testChannelCredential, updateChannelHealthFromCredentials } from '#server/utils/gateway-channel'
import { db } from '@/db/drizzle'
import { channel, channelCredential } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const channelId = getRouterParam(event, 'id')
    const body = await readBody(event).catch(() => ({}))
    const credentialId = typeof body?.credentialId === 'string' ? body.credentialId : undefined
    const [targetChannel] = await db.select().from(channel).where(eq(channel.id, channelId!))
    if (!targetChannel) {
      return responseError(null, '渠道不存在或无权访问', { statusCode: 404 })
    }

    const credentials = await db
      .select()
      .from(channelCredential)
      .where(
        credentialId
          ? and(eq(channelCredential.channelId, channelId!), eq(channelCredential.id, credentialId))
          : eq(channelCredential.channelId, channelId!),
      )
      .orderBy(asc(channelCredential.sort), asc(channelCredential.createdAt))

    if (credentialId && credentials.length === 0) {
      return responseError(null, '凭证不存在或无权操作', { statusCode: 404 })
    }

    const results = await Promise.all(credentials.map(item => testChannelCredential(targetChannel, item)))
    const health = await updateChannelHealthFromCredentials(targetChannel.id)
    if (credentialId) {
      return responseSuccess({ ...results[0], channelHealth: health })
    }

    return responseSuccess({
      channelId: targetChannel.id,
      total: results.length,
      healthy: results.filter(item => item.healthy).length,
      unhealthy: results.filter(item => !item.healthy).length,
      channelHealth: health,
      results,
    })
  }
  catch (err) {
    return responseError(err)
  }
})
