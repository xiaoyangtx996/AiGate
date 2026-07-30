import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { skill, skillFile } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const fileId = getRouterParam(event, 'fileId')
    if (fileId === 'skill-md')
      return responseError(null, 'SKILL.md cannot be deleted', { statusCode: 400 })

    const skillWhere = !principal.isAdmin && principal.organizationId
      ? and(eq(skill.id, id!), eq(skill.organizationId, principal.organizationId))
      : eq(skill.id, id!)
    const [current] = await db.select().from(skill).where(skillWhere)
    if (!current)
      return responseError(null, 'Skill not found', { statusCode: 404 })

    const [deleted] = await db
      .delete(skillFile)
      .where(and(eq(skillFile.id, fileId!), eq(skillFile.skillId, current.id)))
      .returning()
    if (!deleted)
      return responseError(null, 'File not found', { statusCode: 404 })

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(skillFile)
      .where(eq(skillFile.skillId, current.id))
    await db
      .update(skill)
      .set({ hasFiles: (countRow?.total || 0) > 0, version: sql`${skill.version} + 1` })
      .where(eq(skill.id, current.id))

    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
