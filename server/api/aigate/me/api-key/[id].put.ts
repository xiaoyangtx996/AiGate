import { and, eq } from 'drizzle-orm'
import { myApiKeyUpdateSchema } from '#server/utils/my-api-key'
import { db } from '@/db/drizzle'
import { apiKey } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { userId?: string } | undefined
    if (!principal?.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const id = getRouterParam(event, 'id')
    const body = myApiKeyUpdateSchema.parse(await readBody(event))
    const [res] = await db
      .update(apiKey)
      .set(body)
      .where(and(eq(apiKey.id, id!), eq(apiKey.userId, principal.userId)))
      .returning()

    if (!res) {
      throw createError({ statusCode: 404, statusMessage: '资源不存在或无权操作' })
    }

    return responseSuccess(res)
  } catch (err) {
    return responseError(err)
  }
})
