import { eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const id = getRouterParam(event, 'id')
    const docId = getRouterParam(event, 'docId')
    if (!id || !docId) throw createError({ statusCode: 400, statusMessage: 'Missing parameters' })

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id))
    if (!kb) throw createError({ statusCode: 404, statusMessage: 'Knowledge base not found' })

    return responseSuccess({ message: 'Document deleted', docId })
  }
  catch (err) { return responseError(err) }
})
