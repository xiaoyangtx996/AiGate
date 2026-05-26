import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { alert } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const [res] = await db.update(alert).set({ read: true }).where(eq(alert.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
