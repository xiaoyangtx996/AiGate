import { eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { document, knowledgeBase } from '@/db/schema'

const allowedTypes = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/json',
])

const maxSize = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      return responseError(null, '缺少知识库 ID')
    }

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id))
    if (!kb) {
      return responseError(null, '知识库不存在')
    }

    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const formData = await readMultipartFormData(event)
    if (!formData?.length) {
      return responseError(null, '未上传文件')
    }

    const file = formData.find(part => part.name === 'file' && part.data)
    const chunkSizeValue = formData.find(part => part.name === 'chunkSize')?.data?.toString()
    const chunkSize = Number.parseInt(chunkSizeValue || '1000', 10)

    if (!file?.data) {
      return responseError(null, '缺少上传文件')
    }

    const fileType = file.type || 'text/plain'
    const fileSize = file.data.byteLength
    const fileName = file.filename || 'untitled'

    if (!allowedTypes.has(fileType)) {
      return responseError(null, '不支持的文件类型')
    }

    if (fileSize > maxSize) {
      return responseError(null, '文件过大，最大支持 10MB')
    }

    const [insertedDoc] = await db.insert(document).values({
      knowledgeBaseId: id,
      name: fileName,
      type: fileType,
      size: fileSize,
      status: 'processing',
      chunks: 0,
      metadata: {
        originalName: fileName,
        chunkSize: Number.isNaN(chunkSize) ? 1000 : chunkSize,
      },
    }).returning()
    if (!insertedDoc) {
      throw createError({ statusCode: 500, statusMessage: 'Document upload failed' })
    }

    await db.update(knowledgeBase).set({
      documentCount: sql`${knowledgeBase.documentCount} + 1`,
      size: sql`${knowledgeBase.size} + ${fileSize}`,
    }).where(eq(knowledgeBase.id, id))

    return responseSuccess({
      id: insertedDoc.id,
      name: insertedDoc.name,
      size: insertedDoc.size,
      type: insertedDoc.type,
      status: insertedDoc.status,
    })
  }
  catch (err) {
    return responseError(err)
  }
})
