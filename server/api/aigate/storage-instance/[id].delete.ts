import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { storageInstance } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, 'Forbidden', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const [res] = await db.delete(storageInstance).where(eq(storageInstance.id, id!)).returning()
    if (!res) {
      return responseError(null, 'Storage instance not found', { statusCode: 404 })
    }

    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
