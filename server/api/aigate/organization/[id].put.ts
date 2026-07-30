import { eq } from 'drizzle-orm'
import { auditLog } from '#server/utils/audit-log'
import { moveOrganizationParentQuota } from '#server/utils/quota'
import { clearTenantContextCache } from '#server/utils/tenant'
import { db } from '@/db/drizzle'
import { organization, updateOrgSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const [current] = await db.select().from(organization).where(eq(organization.id, id!))
    if (!current)
      return responseError(null, 'Organization not found', { statusCode: 404 })

    const nextParentId = body?.parentId === undefined ? current.parentId : body.parentId
    const parsed = updateOrgSchema.parse({
      ...body,
      ...(nextParentId
        ? { packageId: null, expireTime: null, accountLimit: -1, tenantStatus: 'active' }
        : {}),
    })
    const res = await db.transaction(async (tx) => {
      await moveOrganizationParentQuota(tx, current, body?.parentId)
      const [updated] = await tx.update(organization).set(parsed).where(eq(organization.id, id!)).returning()
      return updated
    })
    clearTenantContextCache()
    await auditLog(event, 'organization.update', { type: 'organization', id }, current, res)
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
