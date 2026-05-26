import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { agent } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const [res] = await db.update(agent).set(body).where(eq(agent.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
