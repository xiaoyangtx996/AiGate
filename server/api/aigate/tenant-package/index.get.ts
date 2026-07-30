import { asc, ilike, or, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { tenantPackage } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const where = query.keyword
      ? or(ilike(tenantPackage.name, `%${query.keyword}%`), ilike(tenantPackage.description, `%${query.keyword}%`))
      : undefined
    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(tenantPackage).where(where)
    const items = await db
      .select()
      .from(tenantPackage)
      .where(where)
      .orderBy(asc(tenantPackage.sort), asc(tenantPackage.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return responseSuccess(query.page ? { items, total: countRow?.total || 0, page, pageSize } : items)
  }
  catch (err) {
    return responseError(err)
  }
})
