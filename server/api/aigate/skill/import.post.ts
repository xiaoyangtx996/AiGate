import type { H3Event } from 'h3'
import type { SkillTextFile } from '#server/utils/skill'
import { Buffer } from 'node:buffer'
import { eq } from 'drizzle-orm'
import {
  isTextFile,
  normalizeSkillFiles,
  parseSkillFrontmatter,
  parseZipTextFiles,

} from '#server/utils/skill'
import { db } from '@/db/drizzle'
import { skill, skillFile } from '@/db/schema'

const ZIP_FILE_RE = /\.zip$/i

function findSkillMarkdown(files: SkillTextFile[]) {
  return files.find(file => file.path.toLowerCase() === 'skill.md' || file.path.toLowerCase().endsWith('/skill.md'))
}

async function readImportedFiles(event: H3Event) {
  const contentType = String(getHeader(event, 'content-type') || '')
  if (contentType.includes('multipart/form-data')) {
    const formData = await readMultipartFormData(event)
    const files: SkillTextFile[] = []
    for (const part of formData || []) {
      if (!part.data || !part.filename)
        continue
      if (ZIP_FILE_RE.test(part.filename) || part.type === 'application/zip' || part.type === 'application/x-zip-compressed') {
        files.push(...parseZipTextFiles(Buffer.from(part.data)))
        continue
      }
      const content = Buffer.from(part.data).toString('utf8')
      if (!isTextFile(part.filename, content))
        throw createError({ statusCode: 400, statusMessage: `Binary file is not allowed: ${part.filename}` })
      files.push({ path: part.filename, content })
    }
    return normalizeSkillFiles(files)
  }

  const body = await readBody(event)
  if (Array.isArray(body?.files)) {
    return normalizeSkillFiles(
      body.files.map((file: { path?: string, content?: string }) => ({
        path: String(file.path || ''),
        content: String(file.content || ''),
      })),
    )
  }
  if (typeof body?.content === 'string') {
    return normalizeSkillFiles([{ path: 'SKILL.md', content: body.content }])
  }
  return []
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId)
      return responseError(null, 'Missing organization context', { statusCode: 403 })

    const files = await readImportedFiles(event)
    if (files.length === 0)
      return responseError(null, 'No skill files uploaded', { statusCode: 400 })
    for (const file of files) {
      if (!isTextFile(file.path, file.content))
        return responseError(null, `Binary file is not allowed: ${file.path}`, { statusCode: 400 })
    }

    const skillMarkdown = findSkillMarkdown(files)
    if (!skillMarkdown)
      return responseError(null, 'SKILL.md is required', { statusCode: 400 })

    const meta = parseSkillFrontmatter(skillMarkdown.content)
    const extraFiles = files.filter(file => file !== skillMarkdown)
    const result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(skill)
        .values({
          organizationId: principal.organizationId ?? null,
          name: meta.name,
          description: meta.description,
          content: skillMarkdown.content,
          hasFiles: extraFiles.length > 0,
          enabled: true,
        })
        .returning()
      if (!created)
        throw createError({ statusCode: 500, statusMessage: 'Skill import failed' })

      const insertedFiles = extraFiles.length > 0
        ? await tx
            .insert(skillFile)
            .values(extraFiles.map(file => ({ skillId: created.id, path: file.path, content: file.content })))
            .returning()
        : []
      return { ...created, files: [{ id: 'skill-md', skillId: created.id, path: 'SKILL.md', content: created.content }, ...insertedFiles] }
    })

    const [fresh] = await db.select().from(skill).where(eq(skill.id, result.id))
    return responseSuccess({ ...result, ...(fresh || {}) })
  }
  catch (err) {
    return responseError(err)
  }
})
