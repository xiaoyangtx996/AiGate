import { eq } from 'drizzle-orm'
import { auth } from '#server/utils/auth'
import { db } from '@/db/drizzle'
import { member, organization, role as roleTable, userRole } from '@/db/schema'

const adminRoleCodes = new Set(['admin', 'super_admin'])

function isAdminRoleCode(role: string | null | undefined) {
  return !!role && adminRoleCodes.has(role)
}

export async function getRequestPrincipal(event: import('h3').H3Event) {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = session.user.id
  const email = session.user.email
  const preferredRole = session.user.role ?? null

  const roles = await db
    .select({ roleId: userRole.roleId, code: roleTable.code })
    .from(userRole)
    .leftJoin(roleTable, eq(userRole.roleId, roleTable.id))
    .where(eq(userRole.userId, userId))

  const roleIds = roles.map(role => role.roleId)
  const roleCodes = roles.map(role => role.code).filter((code): code is string => !!code)
  const dbAdminRole = roleCodes.find(isAdminRoleCode)
  const role = dbAdminRole || (isAdminRoleCode(preferredRole) ? preferredRole : roleCodes[0] || roles[0]?.roleId || preferredRole || 'user')
  const isAdmin = isAdminRoleCode(role)

  const membershipRows = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))
  const memberships = membershipRows.map(item => item.organizationId)
  const activeOrganizationId = getCookie(event, 'aigate_active_org') || null
  let organizationId: string | null = null

  if (isAdmin) {
    if (activeOrganizationId) {
      const [activeOrg] = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, activeOrganizationId))
      organizationId = activeOrg?.id ?? null
    }
  }
  else {
    organizationId
      = activeOrganizationId && memberships.includes(activeOrganizationId)
        ? activeOrganizationId
        : memberships[0] ?? null
  }

  return {
    userId,
    email,
    role,
    roleIds,
    roleCodes,
    memberships,
    organizationId,
    isAdmin,
    session,
  }
}

export async function requireRequestPrincipal(event: import('h3').H3Event) {
  const principal = event.context.principal as Awaited<ReturnType<typeof getRequestPrincipal>> | undefined

  if (principal) {
    return principal
  }

  return getRequestPrincipal(event)
}

export async function requireAdmin(event: import('h3').H3Event) {
  const principal = await requireRequestPrincipal(event)

  if (!principal.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return principal
}
