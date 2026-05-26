import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    await db.delete(agent).where(eq(agent.id, id!))
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
