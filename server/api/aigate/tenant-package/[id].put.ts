import { eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { clearTenantContextCache } from '#server/utils/tenant'
import { db } from '@/db/drizzle'
import { tenantPackage, updateTenantPackageSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = updateTenantPackageSchema.parse({
      ...body,
      ...(Array.isArray(body?.menuCodes) ? { menuCodes: body.menuCodes } : {}),
    })
    const [before] = await db.select().from(tenantPackage).where(eq(tenantPackage.id, id!))
    const [res] = await db.update(tenantPackage).set(parsed).where(eq(tenantPackage.id, id!)).returning()
    if (!res)
      return responseError(null, 'Tenant package not found', { statusCode: 404 })

    await auditLog(event, 'tenant_package.update', { type: 'tenant_package', id }, before, res)
    clearTenantContextCache()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
