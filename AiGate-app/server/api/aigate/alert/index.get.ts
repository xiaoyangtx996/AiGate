import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

export default defineEventHandler(async () => {
  try {
    const data = await db.select().from(alert).orderBy(desc(alert.createdAt))
    return responseSuccess(data)
  }
  catch (err) { return responseError(err) }
})
