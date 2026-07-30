import { eq } from 'drizzle-orm'
import { saveUploadedDocument } from '#server/utils/knowledge-rag'
import { db } from '@/db/drizzle'
import { knowledgeBase } from '@/db/schema'

const allowedTypes = new Set(['application/pdf', 'text/plain', 'text/markdown', 'text/markdown; charset=utf-8', 'application/json'])
const maxSize = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin && !principal?.organizationId) {
      return responseError(null, '当前账号缺少组织上下文', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    if (!id)
      return responseError(null, '缺少知识库 ID')

    const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id))
    if (!kb)
      return responseError(null, '知识库不存在')

    if (!principal.isAdmin && kb.organizationId !== principal.organizationId) {
      return responseError(null, '无权操作此知识库', { statusCode: 403 })
    }

    const formData = await readMultipartFormData(event)
    if (!formData?.length)
      return responseError(null, '未上传文件')

    const files = formData.filter(part => part.name === 'file' && part.data)
    if (files.length === 0)
      return responseError(null, '缺少上传文件')

    const results = []
    for (const file of files) {
      const fileType = file.type || 'text/plain'
      const fileSize = file.data.byteLength
      const fileName = file.filename || 'untitled'

      if (!allowedTypes.has(fileType)) {
        results.push({ name: fileName, success: false, error: '不支持的文件类型' })
        continue
      }
      if (fileSize > maxSize) {
        results.push({ name: fileName, success: false, error: '文件过大，最大支持 10MB' })
        continue
      }

      try {
        const doc = await saveUploadedDocument({
          kb: {
            ...kb,
            chunkSize: Number(kb.chunkSize || 1000),
            chunkOverlap: Number(kb.chunkOverlap || 200),
          },
          fileName,
          fileType,
          data: file.data,
        })
        results.push({ success: true, document: doc })
      }
      catch (err) {
        results.push({ name: fileName, success: false, error: err instanceof Error ? err.message : '上传失败' })
      }
    }

    if (results.some(item => item.success))
      setResponseStatus(event, 202)

    return responseSuccess(files.length === 1 ? results[0] : { total: results.length, results })
  }
  catch (err) {
    return responseError(err)
  }
})
