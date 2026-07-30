import { applyApiKeyDefaults, checkApiKeyLimit, generateApiKey } from '#server/utils/api-key'
import { myApiKeyCreateSchema } from '#server/utils/my-api-key'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { userId?: string; organizationId?: string | null } | undefined
    if (!principal?.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const limit = await checkApiKeyLimit(principal.userId)
    if (!limit.allowed) {
      throw createError({ statusCode: 400, statusMessage: `每个用户最多持有 ${limit.max} 个活跃密钥` })
    }

    const body = myApiKeyCreateSchema.parse(await readBody(event))
    const values = await applyApiKeyDefaults(body, principal.organizationId)
    const [res] = await db
      .insert(apiKey)
      .values({
        ...values,
        key: generateApiKey(body.env),
        userId: principal.userId,
        organizationId: principal.organizationId ?? null,
        status: 'active',
      })
      .returning()

    return responseSuccess(res)
  } catch (err) {
    return responseError(err)
  }
})
