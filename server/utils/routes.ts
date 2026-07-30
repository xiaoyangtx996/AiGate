const adminRoutes = [
  '/api/aigate/organization',
  '/api/aigate/api-key',
  '/api/aigate/channel',
  '/api/aigate/member',
  '/api/aigate/tenant-package',
  '/api/system-settings',
]

const publicRoutes = [
  '/api/auth',
  '/api/_',
  '/api/common/releases',
  '/api/gateway',
  '/api/openapi',
  '/api/system-settings/internalization/locales',
]

const authenticatedRoutes = ['/api/system-settings/menu-manage']

export function normalizeApiRoutePath(path: string) {
  if (path === '/api/v1/aigate')
    return '/api/aigate'

  if (path.startsWith('/api/v1/aigate/'))
    return path.replace('/api/v1/aigate', '/api/aigate')

  return path
}

export function matchApiRoute(path: string, routes: string[]) {
  const normalizedPath = normalizeApiRoutePath(path)

  return routes.some((route) => {
    if (normalizedPath === route || normalizedPath.startsWith(`${route}/`))
      return true

    return route.endsWith('_') && normalizedPath.startsWith(route)
  })
}

export const apiRoutePolicy = {
  adminRoutes,
  publicRoutes,
  authenticatedRoutes,
  isAdminRoute: (path: string) => matchApiRoute(path, adminRoutes),
  isPublicRoute: (path: string) => matchApiRoute(path, publicRoutes),
  isAuthenticatedRoute: (path: string, method: string) => method === 'GET' && matchApiRoute(path, authenticatedRoutes),
}
