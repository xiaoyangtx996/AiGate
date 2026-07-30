import { eq, inArray } from 'drizzle-orm'
import { redisDel, redisGetJson, redisSetJson } from '#server/utils/redis'
import { db } from '@/db/drizzle'
import { member, organization, tenantPackage } from '@/db/schema'

export interface TenantContext {
  tenant: typeof organization.$inferSelect
  package: typeof tenantPackage.$inferSelect | null
}

const tenantContextCache = new Map<string, { expiresAt: number, value: TenantContext | null }>()
const cacheTtl = 60_000
const cacheTtlSeconds = Math.ceil(cacheTtl / 1000)

function tenantCacheKey(organizationId: string) {
  return `tenant:${organizationId}`
}

export function clearTenantContextCache(organizationId?: string | null) {
  if (!organizationId) {
    tenantContextCache.clear()
    return
  }
  tenantContextCache.delete(organizationId)
  void redisDel(tenantCacheKey(organizationId))
}

async function findTenantAncestor(organizationId: string) {
  let currentId: string | null = organizationId
  let current: typeof organization.$inferSelect | null = null
  const visited = new Set<string>()

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const [row] = await db.select().from(organization).where(eq(organization.id, currentId))
    if (!row)
      return current
    current = row
    if (!row.parentId)
      return row
    currentId = row.parentId
  }

  return current
}

export async function getTenantContext(organizationId?: string | null): Promise<TenantContext | null> {
  if (!organizationId)
    return null

  const cached = tenantContextCache.get(organizationId)
  if (cached && cached.expiresAt > Date.now())
    return cached.value

  const redisCached = await redisGetJson<TenantContext | null>(tenantCacheKey(organizationId))
  if (redisCached !== null) {
    tenantContextCache.set(organizationId, { expiresAt: Date.now() + cacheTtl, value: redisCached })
    return redisCached
  }

  const tenant = await findTenantAncestor(organizationId)
  if (!tenant) {
    tenantContextCache.set(organizationId, { expiresAt: Date.now() + cacheTtl, value: null })
    await redisSetJson(tenantCacheKey(organizationId), null, cacheTtlSeconds)
    return null
  }

  const [pkg] = tenant.packageId
    ? await db.select().from(tenantPackage).where(eq(tenantPackage.id, tenant.packageId))
    : []
  const value = { tenant, package: pkg ?? null }
  tenantContextCache.set(organizationId, { expiresAt: Date.now() + cacheTtl, value })
  await redisSetJson(tenantCacheKey(organizationId), value, cacheTtlSeconds)
  return value
}

export function getTenantBlockReason(context: TenantContext | null) {
  if (!context)
    return null
  if (context.tenant.tenantStatus === 'suspended') {
    return { code: 'TENANT_SUSPENDED', message: 'Tenant is suspended' }
  }
  if (context.tenant.expireTime && context.tenant.expireTime.getTime() < Date.now()) {
    return { code: 'TENANT_EXPIRED', message: 'Tenant has expired' }
  }
  return null
}

export function getTenantPackageMenuCodes(context: TenantContext | null) {
  if (!context?.package || context.package.enabled === false)
    return null
  return context.package.menuCodes || []
}

async function getTenantOrganizationIds(tenantId: string) {
  const orgs = await db.select({ id: organization.id, parentId: organization.parentId }).from(organization)
  const children = new Map<string | null, string[]>()
  for (const org of orgs) {
    const list = children.get(org.parentId) || []
    list.push(org.id)
    children.set(org.parentId, list)
  }

  const ids = new Set<string>()
  const queue = [tenantId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (ids.has(id))
      continue
    ids.add(id)
    queue.push(...(children.get(id) || []))
  }

  return [...ids]
}

export async function countTenantMembers(tenantId: string) {
  const ids = await getTenantOrganizationIds(tenantId)
  if (ids.length === 0)
    return 0

  const rows = await db
    .select({ userId: member.userId })
    .from(member)
    .where(inArray(member.organizationId, ids))
  return new Set(rows.map(row => row.userId)).size
}

export async function assertTenantAccountLimit(organizationId: string, nextUserId?: string) {
  const context = await getTenantContext(organizationId)
  const limit = context?.tenant.accountLimit ?? -1
  if (!context || limit < 0)
    return

  const currentCount = await countTenantMembers(context.tenant.id)
  if (currentCount >= limit) {
    if (!nextUserId)
      throw createError({ statusCode: 403, statusMessage: 'Tenant account limit reached' })

    const orgIds = await getTenantOrganizationIds(context.tenant.id)
    const existing = await db
      .select({ userId: member.userId })
      .from(member)
      .where(inArray(member.organizationId, orgIds))
    if (existing.some(row => row.userId === nextUserId))
      return
    if (existing.length === 0)
      throw createError({ statusCode: 403, statusMessage: 'Tenant account limit reached' })
    throw createError({ statusCode: 403, statusMessage: 'Tenant account limit reached' })
  }
}
