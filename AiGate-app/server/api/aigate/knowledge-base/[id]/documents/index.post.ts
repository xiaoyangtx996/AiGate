import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { knowledgeBase, document } from '@/db/schema'
import { responseError, responseSuccess } from '@/server/utils'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing knowledge base ID' })

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id))
    if (!kb) throw createError({ statusCode: 404, statusMessage: 'Knowledge base not found' })

    if (principal?.organizationId && kb.organizationId !== principal.organizationId) {
      throw createError({ statusCode: 403, statusMessage: '无权操作此知识库' })
    }

    // 解析 multipart form data
    const formData = await readMultipartFormData(event)
    if (!formData) {
      return responseError(new Error('No file uploaded'), 400)
    }

    // 提取文件和元数据
    const file = formData.find(part => part.name === 'file')
    const kbId = formData.find(part => part.name === 'kbId')?.value
    const chunkSize = parseInt(formData.find(part => part.name === 'chunkSize')?.value || '1000')

    if (!file || !kbId) {
      return responseError(new Error('Missing required fields'), 400)
    }

    // 验证文件类型和大小
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown', 'application/json']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      return responseError(new Error('Unsupported file type'), 400)
    }

    if (file.size > maxSize) {
      return responseError(new Error('File too large (max 10MB)'), 400)
    }

    // 保存文档记录到数据库
    const doc = {
      knowledgeBaseId: kbId,
      name: file.filename,
      type: file.type,
      size: file.size,
      status: 'processing',
      chunks: 0,
      metadata: {
        originalName: file.filename,
        chunkSize,
      },
    }

    const [insertedDoc] = await db.insert(document).values(doc).returning()

    // 更新知识库统计
    await db.update(knowledgeBase).set({
      documentCount: sql`${knowledgeBase.documentCount} + 1`,
      size: sql`${knowledgeBase.size} + ${file.size}`,
    }).where(eq(knowledgeBase.id, kbId))

    return responseSuccess({
      id: insertedDoc.id,
      name: insertedDoc.name,
      size: insertedDoc.size,
      type: insertedDoc.type,
      status: insertedDoc.status,
    })
  }
  catch (err) { return responseError(err) }
})
