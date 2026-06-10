import { validateBody, ValidationError } from '#server/utils/validation'
import { db } from '@/db/drizzle'
import { agent, insertAgentSchema } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined

    // 使用 validateBody 验证请求体
    const body = await validateBody(insertAgentSchema)(event)
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    if (!principal?.isAdmin && body.organizationId && body.organizationId !== principal.organizationId) {
      return responseError(null, '无权向其他组织创建 Agent', { statusCode: 403 })
    }

    const [res] = await db
      .insert(agent)
      .values({
        ...body,
        ...(principal?.organizationId && !body.organizationId ? { organizationId: principal.organizationId } : {}),
      })
      .returning()
    return responseSuccess(res)
  } catch (err) {
    // 验证失败时返回详细的错误信息
    if (err instanceof ValidationError) {
      return responseError(err.issues, 'Validation failed')
    }
    return responseError(err)
  }
})
