import { createSkillMarkdown, parseSkillFrontmatter } from '#server/utils/skill'
import { db } from '@/db/drizzle'
import { insertSkillSchema, skill } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const body = await readBody(event)
    if (!principal.isAdmin && body?.organizationId && body.organizationId !== principal.organizationId)
      return responseError(null, 'Cannot create skill in another organization', { statusCode: 403 })

    const content = typeof body?.content === 'string'
      ? body.content
      : createSkillMarkdown(String(body?.name || 'Untitled Skill'), String(body?.description || ''))
    const frontmatter = parseSkillFrontmatter(content)
    const parsed = insertSkillSchema.parse({
      ...body,
      name: body?.name || frontmatter.name,
      description: body?.description ?? frontmatter.description,
      content,
      organizationId: body?.organizationId ?? principal.organizationId ?? null,
      enabled: body?.enabled !== false,
      hasFiles: false,
    })

    const [res] = await db.insert(skill).values(parsed).returning()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
