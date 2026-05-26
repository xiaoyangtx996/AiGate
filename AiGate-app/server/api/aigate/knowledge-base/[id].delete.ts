import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id!))
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
