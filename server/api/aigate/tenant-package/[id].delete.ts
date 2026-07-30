import { eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { clearTenantContextCache } from '#server/utils/tenant'
import { db } from '@/db/drizzle'
import { organization, tenantPackage } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const refs = await db.select({ id: organization.id }).from(organization).where(eq(organization.packageId, id!)).limit(1)
    if (refs.length > 0)
      return responseError(null, 'Tenant package is used by organizations', { statusCode: 409 })

    const [res] = await db.delete(tenantPackage).where(eq(tenantPackage.id, id!)).returning()
    if (!res)
      return responseError(null, 'Tenant package not found', { statusCode: 404 })

    await auditLog(event, 'tenant_package.delete', { type: 'tenant_package', id }, res, null)
    clearTenantContextCache()
    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
