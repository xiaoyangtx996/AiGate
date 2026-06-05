const adminRoutes = [
  '/api/aigate/organization',
  '/api/aigate/api-key',
  '/api/aigate/channel',
  '/api/aigate/member',
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

const authenticatedRoutes = [
  '/api/system-settings/menu-manage',
]

export function matchApiRoute(path: string, routes: string[]) {
  return routes.some((route) => path === route || path.startsWith(route))
}

export const apiRoutePolicy = {
  adminRoutes,
  publicRoutes,
  authenticatedRoutes,
  isAdminRoute: (path: string) => matchApiRoute(path, adminRoutes),
  isPublicRoute: (path: string) => matchApiRoute(path, publicRoutes),
  isAuthenticatedRoute: (path: string, method: string) =>
    method === 'GET' && matchApiRoute(path, authenticatedRoutes),
}
