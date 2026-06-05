import { db } from '@/db/drizzle'
import { insertAgentSchema, agent } from '@/db/schema'
import { validateBody, ValidationError } from '#server/utils/validation'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined

    // 使用 validateBody 验证请求体
    const body = await validateBody(insertAgentSchema)(event)

    const [res] = await db.insert(agent).values({
      ...body,
      ...(principal?.organizationId && !body.organizationId ? { organizationId: principal.organizationId } : {}),
    }).returning()
    return responseSuccess(res)
  }
  catch (err) {
    // 验证失败时返回详细的错误信息
    if (err instanceof ValidationError) {
      return responseError(err.issues, 'Validation failed')
    }
    return responseError(err)
  }
})
