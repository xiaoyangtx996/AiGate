import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { mcpTool } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    await db.delete(mcpTool).where(eq(mcpTool.id, id!))
    return responseSuccess(null)
  }
  catch (err) { return responseError(err) }
})
