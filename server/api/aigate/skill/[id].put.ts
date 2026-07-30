import { and, eq, sql } from 'drizzle-orm'
import { parseSkillFrontmatter } from '#server/utils/skill'
import { db } from '@/db/drizzle'
import { skill } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    if (!principal.isAdmin && body?.organizationId && body.organizationId !== principal.organizationId)
      return responseError(null, 'Cannot move skill to another organization', { statusCode: 403 })

    const patch: Record<string, unknown> = { ...body }
    if (typeof body?.content === 'string') {
      const frontmatter = parseSkillFrontmatter(body.content)
      patch.name = body.name || frontmatter.name
      patch.description = body.description ?? frontmatter.description
      patch.version = sql`${skill.version} + 1`
    }
    delete patch.id
    delete patch.createdAt
    delete patch.updatedAt

    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(skill.id, id!), eq(skill.organizationId, principal.organizationId))
      : eq(skill.id, id!)
    const [res] = await db.update(skill).set(patch).where(where).returning()
    if (!res)
      return responseError(null, 'Skill not found', { statusCode: 404 })

    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
