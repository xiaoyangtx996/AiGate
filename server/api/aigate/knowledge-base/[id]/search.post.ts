import { eq } from 'drizzle-orm'
import { searchKnowledgeBase } from '#server/utils/knowledge-rag'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const query = String(body?.query || '').trim()
    if (!query)
      return responseError(null, 'query 不能为空', { statusCode: 400 })

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id!))
    if (!kb)
      return responseError(null, '知识库不存在', { statusCode: 404 })
    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const hits = await searchKnowledgeBase(kb, query, Number(body?.topK || kb.topK || 5))
    return responseSuccess({ query, hits })
  }
  catch (err) {
    return responseError(err)
  }
})
