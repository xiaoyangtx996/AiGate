import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alertRule } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const data = principal?.organizationId
      ? await db.select().from(alertRule).where(eq(alertRule.organizationId, principal.organizationId)).orderBy(asc(alertRule.createdAt))
      : await db.select().from(alertRule).orderBy(asc(alertRule.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
