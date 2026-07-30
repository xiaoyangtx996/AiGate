import { auditLog } from '#server/utils/audit-log'
import { clearTenantContextCache } from '#server/utils/tenant'
import { db } from '@/db/drizzle'
import { insertTenantPackageSchema, tenantPackage } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const body = await readBody(event)
    const parsed = insertTenantPackageSchema.parse({
      ...body,
      menuCodes: Array.isArray(body?.menuCodes) ? body.menuCodes : [],
      enabled: body?.enabled !== false,
    })
    const [res] = await db.insert(tenantPackage).values(parsed).returning()
    await auditLog(event, 'tenant_package.create', { type: 'tenant_package', id: res?.id }, null, res)
    clearTenantContextCache()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
