import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { menu } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = event.context.params!.id

    if (!id) {
      return responseError(null, '缺少参数 id', { statusCode: 400 })
    }

    const children = await db.select().from(menu).where(eq(menu.parentId, id))
    if (children.length > 0) {
      return responseError(null, '请先删除子菜单', { statusCode: 409 })
    }

    const [res] = await db.delete(menu).where(eq(menu.id, id)).returning()
    return responseSuccess(res)
  }
  catch (err) {
    return responseError(err)
  }
})
