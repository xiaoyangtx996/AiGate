import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { storageInstance, updateStorageInstanceSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, 'Forbidden', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = updateStorageInstanceSchema.parse({ ...body, type: 'pgvector', category: 'vector' })
    const [res] = await db.update(storageInstance).set(parsed).where(eq(storageInstance.id, id!)).returning()
    if (!res) {
      return responseError(null, 'Storage instance not found', { statusCode: 404 })
    }

    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
