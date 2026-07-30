import { and, eq, sql } from 'drizzle-orm'
import { isTextFile, normalizeSkillPath, parseSkillFrontmatter } from '#server/utils/skill'
import { db } from '@/db/drizzle'
import { skill, skillFile } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const path = normalizeSkillPath(String(body?.path || ''))
    const content = typeof body?.content === 'string' ? body.content : ''
    if (!path)
      return responseError(null, 'File path is required', { statusCode: 400 })
    if (!isTextFile(path, content))
      return responseError(null, 'Binary file is not allowed', { statusCode: 400 })

    const where = !principal.isAdmin && principal.organizationId
      ? and(eq(skill.id, id!), eq(skill.organizationId, principal.organizationId))
      : eq(skill.id, id!)
    const [current] = await db.select().from(skill).where(where)
    if (!current)
      return responseError(null, 'Skill not found', { statusCode: 404 })

    if (path.toLowerCase() === 'skill.md') {
      const frontmatter = parseSkillFrontmatter(content)
      const [updated] = await db
        .update(skill)
        .set({ content, name: frontmatter.name, description: frontmatter.description, version: current.version + 1 })
        .where(eq(skill.id, current.id))
        .returning()
      return responseSuccess({ id: 'skill-md', skillId: current.id, path: 'SKILL.md', content: updated?.content ?? content, primary: true })
    }

    const [existing] = await db
      .select({ id: skillFile.id })
      .from(skillFile)
      .where(and(eq(skillFile.skillId, current.id), eq(skillFile.path, path)))
    if (existing)
      return responseError(null, 'File path already exists', { statusCode: 409 })

    const [created] = await db.insert(skillFile).values({ skillId: current.id, path, content }).returning()
    await db.update(skill).set({ hasFiles: true, version: sql`${skill.version} + 1` }).where(eq(skill.id, current.id))
    return responseSuccess(created)
  }
  catch (err) {
    return responseError(err)
  }
})
