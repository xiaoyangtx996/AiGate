import { and, eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { encryptCredential } from '#server/utils/credential-crypto'
import { toPublicCredential } from '#server/utils/gateway-channel'
import { db } from '@/db/drizzle'
import { channelCredential, updateChannelCredentialSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, userId?: string } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const channelId = getRouterParam(event, 'id')
    const credentialId = getRouterParam(event, 'credentialId')
    const body = await readBody(event)
    const parsed = updateChannelCredentialSchema.parse(body)
    if (parsed.apiKey) {
      parsed.apiKey = encryptCredential(parsed.apiKey)
    }
    const where = and(eq(channelCredential.id, credentialId!), eq(channelCredential.channelId, channelId!))
    const [before] = principal.userId ? await db.select().from(channelCredential).where(where) : []
    const [res] = await db
      .update(channelCredential)
      .set(parsed)
      .where(where)
      .returning()

    if (!res) {
      return responseError(null, '凭证不存在或无权操作', { statusCode: 404 })
    }

    await auditLog(event, 'channel_credential.update', { type: 'channel_credential', id: credentialId }, before ?? null, res)
    return responseSuccess(toPublicCredential(res))
  }
  catch (err) {
    return responseError(err)
  }
})
