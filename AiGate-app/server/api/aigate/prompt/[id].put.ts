import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const [res] = await db.update(prompt).set(body).where(eq(prompt.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
