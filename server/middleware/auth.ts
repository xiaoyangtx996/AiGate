import { getRequestPrincipal } from '#server/utils/context'
import { apiRoutePolicy, normalizeApiRoutePath } from '#server/utils/routes'
import { getTenantBlockReason, getTenantContext } from '#server/utils/tenant'

function shouldSkipTenantGuard(path: string) {
  return path.includes('/api/auth/sign-out')
    || path.includes('/api/aigate/active-organization')
    || path.includes('/api/aigate/active-organizations')
    || path.includes('/api/aigate/me/password-state')
    || path.includes('/api/aigate/me/force-password-change')
}

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const policyPath = normalizeApiRoutePath(path)
  const method = event.method

  if (!path.startsWith('/api')) {
    return
  }

  if (apiRoutePolicy.isPublicRoute(policyPath)) {
    return
  }

  const principal = await getRequestPrincipal(event)
  event.context.principal = principal

  if (apiRoutePolicy.isAuthenticatedRoute(policyPath, method)) {
    return
  }

  if (!principal.isAdmin && !shouldSkipTenantGuard(policyPath)) {
    const tenantContext = await getTenantContext(principal.organizationId)
    const blockReason = getTenantBlockReason(tenantContext)
    if (blockReason) {
      return responseError(
        { code: blockReason.code, tenantId: tenantContext?.tenant.id },
        blockReason.message,
        { statusCode: 403 },
      )
    }
  }

  if (apiRoutePolicy.isAdminRoute(policyPath) && !principal.isAdmin) {
    return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
  }
})
