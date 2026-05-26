import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    await db.delete(prompt).where(eq(prompt.id, id!))
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
