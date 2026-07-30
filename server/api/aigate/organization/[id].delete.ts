import { auditLog } from '#server/utils/audit-log'
import { deleteOrganizationReturningQuota } from '#server/utils/quota'
import { clearTenantContextCache } from '#server/utils/tenant'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const deleted = await deleteOrganizationReturningQuota(id!)
    clearTenantContextCache()
    await auditLog(event, 'organization.delete', { type: 'organization', id }, deleted, null)
    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
