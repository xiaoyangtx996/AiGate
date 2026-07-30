import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

interface OrgNode {
  id: string
  name: string
  parentId: string | null
  level: string
  tokenLimit: number
  tokenUsed: number
  packageId: string | null
  expireTime: Date | null
  accountLimit: number
  tenantStatus: string
  children: OrgNode[]
}

function buildTree(orgs: OrgNode[], parentId: string | null = null): OrgNode[] {
  return orgs
    .filter(o => o.parentId === parentId)
    .map(o => ({
      ...o,
      children: buildTree(orgs, o.id),
    }))
}

function toOrgNodes(orgs: Array<typeof organization.$inferSelect>): OrgNode[] {
  return orgs.map(org => ({
    id: org.id,
    name: org.name,
    parentId: org.parentId,
    level: org.level,
    tokenLimit: org.tokenLimit,
    tokenUsed: org.tokenUsed,
    packageId: org.packageId,
    expireTime: org.expireTime,
    accountLimit: org.accountLimit,
    tenantStatus: org.tenantStatus,
    children: [],
  }))
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const query = getQuery(event)
    const allOrgs = await db.select().from(organization).orderBy(organization.name)
    if (query.flat === 'true') {
      return responseSuccess(allOrgs)
    }
    const tree = buildTree(toOrgNodes(allOrgs))
    return responseSuccess(tree)
  }
  catch (err) {
    return responseError(err)
  }
})
