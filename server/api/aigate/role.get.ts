import { asc } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { role } from '@/db/schema'

export default defineEventHandler(async () => {
  try {
    const data = await db
      .select({ id: role.id, name: role.name, code: role.code, enabled: role.enabled })
      .from(role)
      .orderBy(asc(role.sort), asc(role.createdAt))

    return responseSuccess(data.filter(item => item.enabled))
  } catch (err) {
    return responseError(err)
  }
})
