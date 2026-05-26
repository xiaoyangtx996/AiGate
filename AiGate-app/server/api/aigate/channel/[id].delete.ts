import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    await db.delete(channel).where(eq(channel.id, id!))
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
