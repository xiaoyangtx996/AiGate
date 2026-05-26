import { desc } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { billingRecord } from '@/db/schema'

export default defineEventHandler(async () => {
  try {
    const data = await db.select().from(billingRecord).orderBy(desc(billingRecord.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
