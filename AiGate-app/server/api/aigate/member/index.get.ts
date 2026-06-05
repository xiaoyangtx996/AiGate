import { and, asc, eq, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { member, user } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId) { conditions.push(eq(member.organizationId, principal.organizationId)) }
    if (query.keyword) { conditions.push(ilike(user.name, `%${query.keyword}%`)) }
    const where = conditions.length ? and(...conditions) : undefined
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
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
