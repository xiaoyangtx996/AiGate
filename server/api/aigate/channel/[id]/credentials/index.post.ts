import { eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { encryptCredential } from '#server/utils/credential-crypto'
import { toPublicCredential } from '#server/utils/gateway-channel'
import { db } from '@/db/drizzle'
import { channel, channelCredential, insertChannelCredentialSchema } from '@/db/schema'

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

    const body = await readBody(event)
    const parsed = insertChannelCredentialSchema.parse({ ...body, channelId })
    parsed.apiKey = encryptCredential(parsed.apiKey)
    const [res] = await db.insert(channelCredential).values(parsed).returning()
    if (!res) {
      throw createError({ statusCode: 500, statusMessage: '凭证创建失败' })
    }
    await auditLog(event, 'channel_credential.create', { type: 'channel_credential', id: res.id }, null, res)
    return responseSuccess(toPublicCredential(res))
  }
  catch (err) {
    return responseError(err)
  }
})
