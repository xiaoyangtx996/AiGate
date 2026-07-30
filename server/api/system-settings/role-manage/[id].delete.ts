import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { role } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params!.id

    if (!id) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    const [res] = await db.delete(role).where(eq(role.id, id)).returning()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
