import { db } from '@/db/drizzle'
import { insertApiKeySchema, apiKey } from '@/db/schema'
import { checkApiKeyLimit, generateApiKey } from '#server/utils/api-key'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string; organizationId?: string | null } | undefined
    if (!principal?.userId) {
      return responseSuccess(null, '未登录', 401)
    }
    const limit = await checkApiKeyLimit(principal.userId)
    if (!limit.allowed) {
      return responseSuccess(null, `每个用户最多持有 ${limit.max} 个活跃密钥`, 400)
    }
    const body = await readBody(event)
    const parsed = insertApiKeySchema.parse(body)
    const keyValue = parsed.key || generateApiKey('dev')
    const [res] = await db.insert(apiKey).values({
      ...parsed,
      key: keyValue,
      userId: principal.userId,
      ...(principal?.organizationId && !parsed.organizationId ? { organizationId: principal.organizationId } : {}),
    }).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
