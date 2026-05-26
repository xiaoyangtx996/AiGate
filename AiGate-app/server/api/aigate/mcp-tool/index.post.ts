import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const [res] = await db.insert(mcpTool).values(body).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
