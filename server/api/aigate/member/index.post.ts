import { assertTenantAccountLimit } from '#server/utils/tenant'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { insertMemberSchema, member } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    const body = await readBody(event)
    const parsed = insertMemberSchema.parse(body)
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    if (!principal?.isAdmin && parsed.organizationId && parsed.organizationId !== principal.organizationId) {
      return responseError(null, '无权向其他组织添加成员', { statusCode: 403 })
    }

    const organizationId = parsed.organizationId || principal.organizationId
    if (!organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })
    await assertTenantAccountLimit(organizationId, parsed.userId)

    const [res] = await db
      .insert(member)
      .values({
        ...parsed,
        organizationId,
      })
      .returning()
    await auditLog(event, 'member.create', { type: 'member', id: res?.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
