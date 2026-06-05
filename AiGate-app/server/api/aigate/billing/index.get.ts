import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { billingRecord } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const data = principal?.organizationId
      ? await db.select().from(billingRecord).where(eq(billingRecord.organizationId, principal.organizationId)).orderBy(desc(billingRecord.createdAt))
      : await db.select().from(billingRecord).orderBy(desc(billingRecord.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
