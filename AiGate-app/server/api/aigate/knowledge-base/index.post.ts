import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const [res] = await db.insert(knowledgeBase).values(body).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
