import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { skill } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(skill.id, id!), eq(skill.organizationId, principal.organizationId))
      : eq(skill.id, id!)
    const [res] = await db.delete(skill).where(where).returning()
    if (!res)
      return responseError(null, 'Skill not found', { statusCode: 404 })

    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
