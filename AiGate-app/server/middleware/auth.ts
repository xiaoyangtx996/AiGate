import { getRequestPrincipal } from '#server/utils/context'
import { apiRoutePolicy } from '#server/utils/routes'
import { RESPONSE_CODE } from '@/enums'

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const method = event.method

  if (!path.startsWith('/api')) {
    return
  }

  if (apiRoutePolicy.isPublicRoute(path)) {
    return
  }

  const principal = await getRequestPrincipal(event)
  event.context.principal = principal

  if (apiRoutePolicy.isAuthenticatedRoute(path, method)) {
    return
  }

  if (apiRoutePolicy.isAdminRoute(path) && !principal.isAdmin) {
    return responseSuccess(null, '当前账号无权访问该资源', RESPONSE_CODE.FORBIDDEN)
  }
})
