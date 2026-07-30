import { db } from '@/db/drizzle'
import { insertStorageInstanceSchema, storageInstance } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }
    const body = await readBody(event)
    const parsed = insertStorageInstanceSchema.parse({ ...body, type: 'pgvector', category: 'vector' })
    const [res] = await db.insert(storageInstance).values(parsed).returning()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
