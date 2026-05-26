import { db } from '@/db/drizzle'
import { insertApiKeySchema, apiKey } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const parsed = insertApiKeySchema.parse(body)
    const [res] = await db.insert(apiKey).values(parsed).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
