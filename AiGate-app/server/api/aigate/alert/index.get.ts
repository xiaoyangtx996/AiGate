import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const where = principal?.organizationId ? eq(alert.organizationId, principal.organizationId) : undefined
    const data = await db.select().from(alert).where(where).orderBy(desc(alert.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
