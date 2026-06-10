import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { billingRecord } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const where = !principal.isAdmin && principal.organizationId
      ? eq(billingRecord.organizationId, principal.organizationId)
      : undefined

    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(billingRecord).where(where)
    const data = await db.select().from(billingRecord).where(where).orderBy(desc(billingRecord.createdAt)).limit(pageSize).offset(offset)
    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) { return responseError(err) }
})
