import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { skill, skillFile } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(skill.id, id!), eq(skill.organizationId, principal.organizationId))
      : eq(skill.id, id!)
    const [current] = await db.select().from(skill).where(where)
    if (!current)
      return responseError(null, 'Skill not found', { statusCode: 404 })

    const files = await db.select().from(skillFile).where(eq(skillFile.skillId, current.id))
    return responseSuccess([
      { id: 'skill-md', skillId: current.id, path: 'SKILL.md', content: current.content, primary: true },
      ...files.map(file => ({ ...file, primary: false })),
    ])
  }
  catch (err) {
    return responseError(err)
  }
})
