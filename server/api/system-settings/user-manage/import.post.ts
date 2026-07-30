import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '#server/utils/auth'
import { assertTenantAccountLimit } from '#server/utils/tenant'
import { db } from '@/db/drizzle'
import { member, organization, role, userRole } from '@/db/schema'

const importBodySchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).max(200),
})

const roleSplitPattern = /[,;|]/
const slashPattern = /\/+/g
const headerNormalizePattern = /[\s_-]/g
const leadingSlashPattern = /^\//

function normalizeKey(key: string) {
  return key.toLowerCase().replace(headerNormalizePattern, '')
}

function normalizeValue(value?: string | null) {
  return String(value || '').trim()
}

function getCell(row: Record<string, string>, aliases: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]))
  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias))
    if (value)
      return normalizeValue(value)
  }
  return ''
}

function splitRoleCodes(value: string) {
  return value
    .split(roleSplitPattern)
    .map(item => item.trim())
    .filter(Boolean)
}

function buildOrganizationPathMap(rows: Array<typeof organization.$inferSelect>) {
  const byId = new Map(rows.map(row => [row.id, row]))
  const pathMap = new Map<string, string>()

  function buildPath(row: typeof organization.$inferSelect): string {
    const parent = row.parentId ? byId.get(row.parentId) : null
    const parentPath = parent ? buildPath(parent) : ''
    return `${parentPath}/${row.name}`.replace(slashPattern, '/')
  }

  for (const row of rows) {
    const fullPath = buildPath(row)
    pathMap.set(row.id.toLowerCase(), row.id)
    pathMap.set(row.name.toLowerCase(), row.id)
    pathMap.set(fullPath.toLowerCase(), row.id)
    pathMap.set(fullPath.replace(leadingSlashPattern, '').toLowerCase(), row.id)
  }

  return pathMap
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, userId?: string } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Admin only', { statusCode: 403 })

    const body = importBodySchema.parse(await readBody(event))
    const [roles, organizations] = await Promise.all([
      db.select().from(role).where(eq(role.enabled, true)),
      db.select().from(organization),
    ])
    const roleByCode = new Map(roles.map(item => [item.code.toLowerCase(), item]))
    const orgPathMap = buildOrganizationPathMap(organizations)
    const results: Array<{ row: number, username?: string, ok: boolean, userId?: string, reason?: string }> = []

    for (const [index, row] of body.rows.entries()) {
      const rowNumber = Number(row.row || index + 2)
      const username = getCell(row, ['username', 'userName'])
      const displayName = getCell(row, ['displayName', 'name', 'display name']) || username
      const password = getCell(row, ['initialPassword', 'password', 'initial password'])
      const email = getCell(row, ['email']) || (username ? `${username}@aigate.local` : '')
      const roleCodes = splitRoleCodes(getCell(row, ['roleCode', 'roleCodes', 'role code', 'roles']))
      const organizationRef = getCell(row, ['organizationPath', 'orgPath', 'organization', 'organizationName', 'org'])

      try {
        if (!username || !password)
          throw new Error('username and password are required')

        const matchedRoles = roleCodes.map((code) => {
          const matched = roleByCode.get(code.toLowerCase())
          if (!matched)
            throw new Error(`role code not found: ${code}`)
          return matched
        })
        const organizationId = organizationRef ? orgPathMap.get(organizationRef.toLowerCase()) : undefined
        if (organizationRef && !organizationId)
          throw new Error(`organization not found: ${organizationRef}`)
        if (organizationId)
          await assertTenantAccountLimit(organizationId)

        const created = await auth.api.createUser({
          headers: event.headers,
          body: {
            email,
            password,
            name: displayName,
            role: roleCodes.length > 1 ? roleCodes : roleCodes[0],
            data: {
              username,
              displayUsername: displayName,
            },
          },
        } as Parameters<typeof auth.api.createUser>[0])
        const createdUser = (created as { user?: { id?: string } }).user
        if (!createdUser?.id)
          throw new Error('user creation failed')

        if (matchedRoles.length > 0) {
          await db.insert(userRole).values(matchedRoles.map(item => ({ userId: createdUser.id!, roleId: item.id })))
        }
        if (organizationId) {
          await db.insert(member).values({ userId: createdUser.id, organizationId })
        }

        results.push({ row: rowNumber, username, ok: true, userId: createdUser.id })
      }
      catch (err) {
        results.push({
          row: rowNumber,
          username,
          ok: false,
          reason: err instanceof Error ? err.message : 'import failed',
        })
      }
    }

    return responseSuccess({
      imported: results.filter(item => item.ok).length,
      failed: results.filter(item => !item.ok).length,
      results,
    })
  }
  catch (err) {
    return responseError(err)
  }
})
