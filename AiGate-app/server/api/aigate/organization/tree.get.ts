import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

interface OrgNode {
  id: string
  name: string
  parentId: string | null
  level: string
  tokenLimit: number
  tokenUsed: number
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

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const allOrgs = await db.select().from(organization).orderBy(organization.name)
    if (query.flat === 'true') {
      return responseSuccess(allOrgs)
    }
    const tree = buildTree(allOrgs as OrgNode[])
    return responseSuccess(tree)
  }
  catch (err) { return responseError(err) }
})
