import { eq } from 'drizzle-orm'
import { syncChannelModels } from '#server/utils/gateway-channel'
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

    const [credential] = credentialId
      ? await db
          .select()
          .from(channelCredential)
          .where(eq(channelCredential.id, credentialId))
          .limit(1)
      : []

    if (credentialId && (!credential || credential.channelId !== targetChannel.id)) {
      return responseError(null, '凭证不存在或无权操作', { statusCode: 404 })
    }

    return responseSuccess(await syncChannelModels(targetChannel, credential))
  }
  catch (err) {
    return responseError(err)
  }
})
