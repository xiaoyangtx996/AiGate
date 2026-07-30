import { and, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { userNotificationPref } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId)
      return responseError(null, 'Unauthorized', { statusCode: 401 })

    const body = await readBody(event)
    const prefs = Array.isArray(body?.prefs) ? body.prefs : []
    const saved = []
    for (const pref of prefs) {
      const alertType = String(pref.alertType || '')
      if (!alertType)
        continue
      const channels = Array.isArray(pref.channels) ? pref.channels.filter((item: unknown) => typeof item === 'string') : ['in_app']
      const [existing] = await db
        .select()
        .from(userNotificationPref)
        .where(and(eq(userNotificationPref.userId, principal.userId), eq(userNotificationPref.alertType, alertType)))
      if (existing) {
        const [updated] = await db
          .update(userNotificationPref)
          .set({ channels })
          .where(and(eq(userNotificationPref.userId, principal.userId), eq(userNotificationPref.alertType, alertType)))
          .returning()
        saved.push(updated)
      }
      else {
        const [created] = await db
          .insert(userNotificationPref)
          .values({ userId: principal.userId, alertType, channels })
          .returning()
        saved.push(created)
      }
    }
    return responseSuccess(saved)
  }
  catch (err) {
    return responseError(err)
  }
})
