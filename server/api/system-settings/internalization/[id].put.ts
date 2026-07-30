import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { internalization, updateInternalizationSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params!.id
    const body = await readBody(event)
    const parsed = updateInternalizationSchema.parse(body)

    if (!id) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    if (id === parsed.parentId) {
      return responseError(null, '父级不能是自己', { statusCode: 409 })
    }

    const [res] = await db.update(internalization).set(parsed).where(eq(internalization.id, id)).returning()
    return responseSuccess(res)
  }
  catch (error) {
    return responseError(error)
  }
})
