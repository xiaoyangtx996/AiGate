import { db } from '@/db/drizzle'
import { insertOrgSchema, organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const parsed = insertOrgSchema.parse(body)
    const [res] = await db.insert(organization).values(parsed).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
