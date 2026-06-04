import { and, asc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const conditions = []
    if (principal?.organizationId) { conditions.push(eq(channel.organizationId, principal.organizationId)) }
    if (query.keyword) {
      conditions.push(or(ilike(channel.name, `%${query.keyword}%`), ilike(channel.vendor, `%${query.keyword}%`)))
    }
    if (query.status) { conditions.push(eq(channel.status, query.status as string)) }
    const data = await db.select().from(channel).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(channel.priority))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
