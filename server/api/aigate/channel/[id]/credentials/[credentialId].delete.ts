import { and, eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { channelCredential } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const channelId = getRouterParam(event, 'id')
    const credentialId = getRouterParam(event, 'credentialId')
    const [res] = await db
      .delete(channelCredential)
      .where(and(eq(channelCredential.id, credentialId!), eq(channelCredential.channelId, channelId!)))
      .returning()

    if (!res) {
      return responseError(null, '凭证不存在或无权操作', { statusCode: 404 })
    }

    await auditLog(event, 'channel_credential.delete', { type: 'channel_credential', id: credentialId }, res, null)
    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
