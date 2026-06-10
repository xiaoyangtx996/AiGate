import { eq } from 'drizzle-orm'
import { auth } from '#server/utils/auth'
import { db } from '@/db/drizzle'
import { member, userRole } from '@/db/schema'

export async function getRequestPrincipal(event: import('h3').H3Event) {
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = session.user.id
  const email = session.user.email
  const preferredRole = session.user.role ?? null

  const roles = await db.select({ roleId: userRole.roleId }).from(userRole).where(eq(userRole.userId, userId))

  const roleIds = roles.map(role => role.roleId)
  const role = preferredRole || roles[0]?.roleId || 'user'

  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId))

  const organizationId = memberships[0]?.organizationId ?? null

  return {
    userId,
    email,
    role,
    roleIds,
    organizationId,
    isAdmin: role === 'admin',
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
