import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization, updateOrgSchema } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = updateOrgSchema.parse(body)
    const [res] = await db.update(organization).set(parsed).where(eq(organization.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
