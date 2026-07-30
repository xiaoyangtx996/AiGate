import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel, channelCredential } from '@/db/schema'

function maskApiKey(apiKey: string) {
  return apiKey.length <= 4 ? '****' : `****${apiKey.slice(-4)}`
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const channelId = getRouterParam(event, 'id')
    const [targetChannel] = await db.select({ id: channel.id }).from(channel).where(eq(channel.id, channelId!))
    if (!targetChannel) {
      return responseError(null, '渠道不存在或无权访问', { statusCode: 404 })
    }

    const data = await db
      .select()
      .from(channelCredential)
      .where(eq(channelCredential.channelId, channelId!))
      .orderBy(asc(channelCredential.sort), asc(channelCredential.createdAt))

    return responseSuccess(data.map(item => ({ ...item, apiKey: undefined, apiKeyMasked: maskApiKey(item.apiKey) })))
  }
  catch (err) {
    return responseError(err)
  }
})
