import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { documentChunk, knowledgeBase } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id!))
    if (!kb)
      return responseError(null, '知识库不存在', { statusCode: 404 })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const conditions = [eq(documentChunk.knowledgeBaseId, id!)]
    if (query.documentId)
      conditions.push(eq(documentChunk.documentId, query.documentId as string))
    const where = and(...conditions)
    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(documentChunk).where(where)
    const items = await db
      .select()
      .from(documentChunk)
      .where(where)
      .orderBy(asc(documentChunk.sort))
      .limit(pageSize)
      .offset(offset)
    return responseSuccess({ items, total: countRow?.total || 0, page, pageSize })
  }
  catch (err) {
    return responseError(err)
  }
})
