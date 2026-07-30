import { asc } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { storageInstance } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    const data = await db.select().from(storageInstance).orderBy(asc(storageInstance.createdAt))
    return responseSuccess(data)
  }
  catch (err) {
    return responseError(err)
  }
})
