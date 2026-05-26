import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    await db.delete(apiKey).where(eq(apiKey.id, id!))
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
