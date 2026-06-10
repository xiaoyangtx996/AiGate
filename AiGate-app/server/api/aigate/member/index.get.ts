import { and, asc, eq, ilike, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { member, user } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId)
      conditions.push(eq(member.organizationId, principal.organizationId))
    if (query.keyword)
      conditions.push(ilike(user.name, `%${query.keyword}%`))
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(where)

    const data = await db
      .select({
        id: member.id,
        userId: member.userId,
        organizationId: member.organizationId,
        createdAt: member.createdAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(member)
      .leftJoin(user, eq(member.userId, user.id))
      .where(where)
      .orderBy(asc(member.createdAt))
      .limit(pageSize)
      .offset(offset)

    return responseSuccess(query.page ? { items: data, total: countRow?.total || 0, page, pageSize } : data)
  }
  catch (err) { return responseError(err) }
})
