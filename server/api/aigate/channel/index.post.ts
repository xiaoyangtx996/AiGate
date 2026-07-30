import { auditLog } from '#server/utils/audit-log'
import { encryptCredential } from '#server/utils/credential-crypto'
import { db } from '@/db/drizzle'
import { channel, channelCredential, insertChannelSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const body = await readBody(event)
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey : undefined
    const parsed = insertChannelSchema.parse(body)
    const { apiKey: _ignoredApiKey, ...channelValues } = parsed as typeof parsed & { apiKey?: string }
    const res = await db.transaction(async (tx) => {
      const [created] = await tx.insert(channel).values(channelValues).returning()
      if (!created)
        throw createError({ statusCode: 500, statusMessage: '渠道创建失败' })

      if (apiKey) {
        await tx.insert(channelCredential).values({
          channelId: created.id,
          name: '主凭证',
          apiKey: encryptCredential(apiKey),
          status: 'active',
          sort: 0,
        })
      }

      return created
    })
    await auditLog(event, 'channel.create', { type: 'channel', id: res.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
