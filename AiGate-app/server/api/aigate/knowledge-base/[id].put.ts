import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const [res] = await db.update(knowledgeBase).set(body).where(eq(knowledgeBase.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
