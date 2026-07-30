import { applyApiKeyDefaults, checkApiKeyLimit, generateApiKey } from '#server/utils/api-key'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { apiKey, insertApiKeySchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, userId?: string, organizationId?: string | null }
      | undefined
    if (!principal?.userId) {
      return responseError(null, '未登录', { statusCode: 401 })
    }
    if (!principal.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }
    const limit = await checkApiKeyLimit(principal.userId)
    if (!limit.allowed) {
      return responseError(null, `每个用户最多持有 ${limit.max} 个活跃密钥`, { statusCode: 400 })
    }
    const body = await readBody(event)
    const parsed = insertApiKeySchema.omit({ key: true, userId: true }).parse(body)
    const values = await applyApiKeyDefaults(parsed, principal.organizationId)
    const keyValue = generateApiKey(parsed.env ?? 'dev')
    const [res] = await db
      .insert(apiKey)
      .values({
        ...values,
        key: keyValue,
        userId: principal.userId,
        ...(principal?.organizationId && !values.organizationId ? { organizationId: principal.organizationId } : {}),
      })
      .returning()
    await auditLog(event, 'api_key.create', { type: 'api_key', id: res?.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
