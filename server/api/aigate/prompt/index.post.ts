import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { insertPromptSchema, prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    const body = await readBody(event)
    const parsed = insertPromptSchema.parse(body)
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    if (!principal?.isAdmin && parsed.organizationId && parsed.organizationId !== principal.organizationId) {
      return responseError(null, '无权向其他组织创建 Prompt', { statusCode: 403 })
    }

    const [res] = await db
      .insert(prompt)
      .values({
        ...parsed,
        ...(principal?.organizationId && !parsed.organizationId ? { organizationId: principal.organizationId } : {}),
      })
      .returning()
    await auditLog(event, 'prompt.create', { type: 'prompt', id: res?.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
