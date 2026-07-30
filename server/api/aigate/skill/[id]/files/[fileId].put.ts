import { and, eq, ne, sql } from 'drizzle-orm'
import { isTextFile, normalizeSkillPath, parseSkillFrontmatter } from '#server/utils/skill'
import { db } from '@/db/drizzle'
import { skill, skillFile } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const id = getRouterParam(event, 'id')
    const fileId = getRouterParam(event, 'fileId')
    const body = await readBody(event)
    const content = typeof body?.content === 'string' ? body.content : ''
    const nextPath = typeof body?.path === 'string' ? normalizeSkillPath(body.path) : undefined

    const skillWhere = !principal.isAdmin && principal.organizationId
      ? and(eq(skill.id, id!), eq(skill.organizationId, principal.organizationId))
      : eq(skill.id, id!)
    const [current] = await db.select().from(skill).where(skillWhere)
    if (!current)
      return responseError(null, 'Skill not found', { statusCode: 404 })

    if (fileId === 'skill-md') {
      if (!isTextFile('SKILL.md', content))
        return responseError(null, 'Binary file is not allowed', { statusCode: 400 })
      const frontmatter = parseSkillFrontmatter(content)
      const [updated] = await db
        .update(skill)
        .set({ content, name: frontmatter.name, description: frontmatter.description, version: current.version + 1 })
        .where(eq(skill.id, current.id))
        .returning()
      return responseSuccess({ id: 'skill-md', skillId: current.id, path: 'SKILL.md', content: updated?.content ?? content, primary: true })
    }

    const [currentFile] = await db.select().from(skillFile).where(and(eq(skillFile.id, fileId!), eq(skillFile.skillId, current.id)))
    if (!currentFile)
      return responseError(null, 'File not found', { statusCode: 404 })

    const path = nextPath || currentFile.path
    if (!isTextFile(path, content))
      return responseError(null, 'Binary file is not allowed', { statusCode: 400 })
    if (nextPath) {
      const [duplicate] = await db
        .select({ id: skillFile.id })
        .from(skillFile)
        .where(and(eq(skillFile.skillId, current.id), eq(skillFile.path, nextPath), ne(skillFile.id, currentFile.id)))
      if (duplicate)
        return responseError(null, 'File path already exists', { statusCode: 409 })
    }

    const [updated] = await db
      .update(skillFile)
      .set({ path, content })
      .where(and(eq(skillFile.id, currentFile.id), eq(skillFile.skillId, current.id)))
      .returning()
    await db.update(skill).set({ version: sql`${skill.version} + 1` }).where(eq(skill.id, current.id))
    return responseSuccess(updated)
  }
  catch (err) {
    return responseError(err)
  }
})
