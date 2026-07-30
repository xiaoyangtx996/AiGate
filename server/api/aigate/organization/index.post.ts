import { clearTenantContextCache } from '#server/utils/tenant'
import { auditLog } from '#server/utils/audit-log'
import { db } from '@/db/drizzle'
import { insertOrgSchema, organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const body = await readBody(event)
    const parsed = insertOrgSchema.parse({
      ...body,
      ...(body?.parentId
        ? { packageId: null, expireTime: null, accountLimit: -1, tenantStatus: 'active' }
        : {}),
    })
    const [res] = await db.insert(organization).values(parsed).returning()
    clearTenantContextCache()
    await auditLog(event, 'organization.create', { type: 'organization', id: res?.id }, null, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
