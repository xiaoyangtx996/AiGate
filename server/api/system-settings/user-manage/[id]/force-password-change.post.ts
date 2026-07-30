import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireAdmin } from '#server/utils/context'
import { db } from '@/db/drizzle'
import { user } from '@/db/schema'

const bodySchema = z.object({
  mustChangePassword: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)

    const id = getRouterParam(event, 'id')
    if (!id)
      return responseError(null, '缺少参数 id', { statusCode: 400 })

    const body = bodySchema.parse(await readBody(event).catch(() => ({})))
    const [updated] = await db
      .update(user)
      .set({ mustChangePassword: body.mustChangePassword, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning({ id: user.id, mustChangePassword: user.mustChangePassword })

    if (!updated)
      return responseError(null, '用户不存在', { statusCode: 404 })

    return responseSuccess(updated)
  }
  catch (err) {
    return responseError(err)
  }
})
