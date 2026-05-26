import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { updateChannelSchema, channel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = updateChannelSchema.parse(body)
    const [res] = await db.update(channel).set(parsed).where(eq(channel.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
