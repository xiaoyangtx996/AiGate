import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { aiModel } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const [res] = await db.delete(aiModel).where(eq(aiModel.id, id!)).returning()
    if (!res) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }
    return responseSuccess(null)
  }
  catch (err) {
    return responseError(err)
  }
})
