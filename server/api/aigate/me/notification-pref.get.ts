import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { userNotificationPref } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId)
      return responseError(null, 'Unauthorized', { statusCode: 401 })

    const rows = await db.select().from(userNotificationPref).where(eq(userNotificationPref.userId, principal.userId))
    return responseSuccess(rows)
  }
  catch (err) {
    return responseError(err)
  }
})
