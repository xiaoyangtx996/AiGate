import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { internalization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params!.id

    if (!id) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    const children = await db.select().from(internalization).where(eq(internalization.parentId, id))
    if (children.length > 0) {
      return responseError(null, '存在子级，不能删除', { statusCode: 409 })
    }

    const [res] = await db.delete(internalization).where(eq(internalization.id, id)).returning()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
