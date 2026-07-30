import { and, asc, ilike } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const query = getQuery(event)
    const conditions = []
    if (query.keyword)
      conditions.push(ilike(organization.name, `%${query.keyword}%`))
    const data = await db
      .select()
      .from(organization)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(organization.createdAt))
    if (query.flat === '1' || query.flat === 'true') {
      return responseSuccess({ items: data, total: data.length })
    }
    return responseSuccess(convertFlatDataToTree(data))
  }
  catch (err) {
    return responseError(err)
  }
})
