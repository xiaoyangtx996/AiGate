import { asc, inArray } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, memberships?: string[], organizationId?: string | null }
      | undefined

    if (!principal) {
      return responseError(null, '未登录', { statusCode: 401 })
    }

    const orgs = principal.isAdmin
      ? await db.select().from(organization).orderBy(asc(organization.name))
      : principal.memberships?.length
        ? await db
            .select()
            .from(organization)
            .where(inArray(organization.id, principal.memberships))
            .orderBy(asc(organization.name))
        : []

    return responseSuccess({
      activeOrganizationId: principal.organizationId,
      globalAvailable: Boolean(principal.isAdmin),
      items: orgs,
    })
  }
  catch (err) {
    return responseError(err)
  }
})
