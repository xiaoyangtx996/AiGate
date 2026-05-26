import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { updateOrgSchema, organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const parsed = updateOrgSchema.parse(body)
    const [res] = await db.update(organization).set(parsed).where(eq(organization.id, id!)).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
