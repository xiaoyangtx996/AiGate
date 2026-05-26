import { asc, eq, ilike, and } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { organization } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.keyword) { conditions.push(ilike(organization.name, `%${query.keyword}%`)) }
    const data = await db.select().from(organization).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(organization.createdAt))
    return responseSuccess(convertFlatDataToTree(data))
  }
  catch (err) { return responseError(err) }
})
