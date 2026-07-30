import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { menu, updateMenuSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params!.id
    const body = await readBody(event)
    const parsed = updateMenuSchema.parse(body)

    if (!id) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    if (id === parsed.parentId) {
      return responseError(null, '父菜单不能是自己', { statusCode: 409 })
    }

    const [res] = await db.update(menu).set(parsed).where(eq(menu.id, id)).returning()
    return responseSuccess(res)
  }
  catch (error) {
    return responseError(error)
  }
})
