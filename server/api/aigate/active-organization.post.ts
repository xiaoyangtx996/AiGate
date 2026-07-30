import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, memberships?: string[], organizationId?: string | null }
      | undefined
    const body = await readBody<{ organizationId?: string | null }>(event)
    const organizationId = body?.organizationId || null

    if (!principal) {
      return responseError(null, '未登录', { statusCode: 401 })
    }

    if (!organizationId) {
      if (!principal.isAdmin) {
        return responseError(null, '请选择有效组织', { statusCode: 400 })
      }

      deleteCookie(event, 'aigate_active_org', { path: '/' })
      return responseSuccess({ organizationId: null })
    }

    if (principal.isAdmin) {
      const [targetOrg] = await db.select({ id: organization.id }).from(organization).where(eq(organization.id, organizationId))
      if (!targetOrg) {
        return responseError(null, '组织不存在', { statusCode: 404 })
      }
    }
    else if (!principal.memberships?.includes(organizationId)) {
      return responseError(null, '无权切换到该组织', { statusCode: 403 })
    }

    setCookie(event, 'aigate_active_org', organizationId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    return responseSuccess({ organizationId })
  }
  catch (err) {
    return responseError(err)
  }
})
