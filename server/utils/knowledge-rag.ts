import type { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { proxyToChannel, selectChannel } from '#server/utils/gateway'
import { embedTextsViaGateway } from '#server/utils/knowledge-embedding'
import { enqueueKnowledgeDocument, requeueInterruptedKnowledgeDocuments } from '#server/utils/knowledge-jobs'
import { db } from '@/db/drizzle'
import { aiModel, document, documentChunk, knowledgeBase } from '@/db/schema'

const WINDOWS_NEWLINE_RE = /\r\n/g

export function sha256(buffer: Buffer | Uint8Array | string) {
  return createHash('sha256').update(buffer).digest('hex')
}

export function estimateTokens(content: string) {
  return Math.max(1, Math.ceil(content.length / 4))
}

export function chunkText(content: string, chunkSize = 1000, chunkOverlap = 200) {
  const normalized = content.replace(WINDOWS_NEWLINE_RE, '\n').trim()
  if (!normalized)
    return []
  const chunks: string[] = []
  const step = Math.max(1, chunkSize - chunkOverlap)
  for (let start = 0; start < normalized.length; start += step) {
    chunks.push(normalized.slice(start, start + chunkSize))
    if (start + chunkSize >= normalized.length)
      break
  }
  return chunks
}

async function resolveEmbeddingModelName(kb: typeof knowledgeBase.$inferSelect) {
  if (kb.embeddingModelId) {
    const [model] = await db.select().from(aiModel).where(eq(aiModel.id, kb.embeddingModelId)).limit(1)
    if (model?.name)
      return model.name
  }
  return kb.embeddingModel || 'text-embedding-3-small'
}

function toVectorLiteral(vector: number[]) {
  return `[${vector.join(',')}]`
}

export interface KnowledgeSearchHit {
  id: string
  documentId: string
  knowledgeBaseId: string
  sort: number
  content: string
  tokenCount: number
  contentHash: string | null
  createdAt: Date | string
  score: number
}

async function extractDocumentText(doc: typeof document.$inferSelect) {
  const type = String(doc.type || '').toLowerCase()
  if (!doc.path)
    throw new Error('文档路径缺失')
  const buffer = await readFile(doc.path)

  if (type.includes('pdf')) {
    const pdfParse = (await import('pdf-parse')).default
    const parsed = await pdfParse(buffer)
    if (!parsed.text?.trim())
      throw new Error('PDF 无文本层（扫描件暂不支持）')
    return parsed.text
  }

  if (type.includes('json') || type.includes('markdown') || type.includes('text') || type.includes('plain')) {
    return buffer.toString('utf8')
  }

  const metadataText = String((doc.metadata as { rawText?: string } | null)?.rawText || '')
  if (metadataText)
    return metadataText

  throw new Error('文档内容为空或不支持解析')
}

async function rerankCandidates(
  kb: typeof knowledgeBase.$inferSelect,
  query: string,
  candidates: Array<Record<string, unknown>>,
  topK: number,
) {
  if (!kb.rerankModelId || candidates.length === 0)
    return candidates.slice(0, topK)

  const [rerankModel] = await db.select().from(aiModel).where(eq(aiModel.id, kb.rerankModelId)).limit(1)
  if (!rerankModel?.name)
    return candidates.slice(0, topK)

  const channel = await selectChannel(rerankModel.name, kb.organizationId)
  if (!channel)
    return candidates.slice(0, topK)

  try {
    const result = await proxyToChannel(
      channel,
      'v1/rerank',
      'POST',
      { 'Content-Type': 'application/json' },
      {
        model: rerankModel.name,
        query,
        documents: candidates.map(item => String(item.content || '')),
        top_n: topK,
      },
    )
    if (result.status >= 400)
      return candidates.slice(0, topK)

    const parsed = JSON.parse(result.body) as { results?: Array<{ index: number, relevance_score?: number }> }
    const ordered = (parsed.results || [])
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .map((item) => {
        const candidate = candidates[item.index]
        if (!candidate)
          return null
        return {
          ...candidate,
          score: Number(Number(item.relevance_score ?? candidate.score ?? 0).toFixed(4)),
        }
      })
      .flatMap(item => item ? [item] : [])
    return ordered.length > 0 ? ordered.slice(0, topK) : candidates.slice(0, topK)
  }
  catch {
    return candidates.slice(0, topK)
  }
}

export async function saveUploadedDocument(options: {
  kb: typeof knowledgeBase.$inferSelect
  fileName: string
  fileType: string
  data: Buffer
}) {
  const contentHash = sha256(options.data)
  const duplicateRows = await db
    .select()
    .from(document)
    .where(and(eq(document.knowledgeBaseId, options.kb.id), eq(document.contentHash, contentHash)))

  if (duplicateRows.length > 0) {
    if (options.kb.dedupStrategy === 'reject') {
      throw createError({ statusCode: 409, statusMessage: '文件内容重复' })
    }
    if (options.kb.dedupStrategy === 'skip') {
      return duplicateRows[0]!
    }
    await Promise.all(duplicateRows.map(item => db.delete(document).where(eq(document.id, item.id))))
  }

  const uploadDir = join(process.cwd(), 'data', 'uploads', options.kb.id)
  await mkdir(uploadDir, { recursive: true })
  const filePath = join(uploadDir, `${contentHash}-${options.fileName}`)
  await writeFile(filePath, options.data)

  const isPdf = options.fileType.toLowerCase().includes('pdf')
  const [created] = await db
    .insert(document)
    .values({
      knowledgeBaseId: options.kb.id,
      name: options.fileName,
      type: options.fileType,
      size: options.data.byteLength,
      path: filePath,
      status: 'uploaded',
      chunks: 0,
      chunkCount: 0,
      tokenCount: 0,
      contentHash,
      metadata: {
        originalName: options.fileName,
        ...(isPdf ? {} : { rawText: options.data.toString('utf8') }),
      },
    })
    .returning()
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'Document upload failed' })
  }

  await enqueueKnowledgeDocument(created.id)
  return created
}

export async function processDocument(documentId: string, options?: { reindex?: boolean }) {
  const [doc] = await db.select().from(document).where(eq(document.id, documentId))
  if (!doc)
    throw createError({ statusCode: 404, statusMessage: '文档不存在' })
  const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, doc.knowledgeBaseId))
  if (!kb)
    throw createError({ statusCode: 404, statusMessage: '知识库不存在' })

  const shouldUpdateKbInventory = !options?.reindex && doc.status !== 'ready'

  try {
    await db.update(document).set({ status: 'parsing', errorMsg: null, errorMessage: null }).where(eq(document.id, doc.id))
    const content = await extractDocumentText(doc)
    if (!content.trim())
      throw new Error('文档内容为空或不支持解析')

    await db.update(document).set({ status: 'chunking' }).where(eq(document.id, doc.id))
    const chunks = chunkText(content, kb.chunkSize, kb.chunkOverlap)
    await db.delete(documentChunk).where(eq(documentChunk.documentId, doc.id))

    await db.update(document).set({ status: 'embedding' }).where(eq(document.id, doc.id))
    const modelName = await resolveEmbeddingModelName(kb)
    const vectors = chunks.length > 0
      ? await embedTextsViaGateway({
          organizationId: kb.organizationId,
          modelName,
          texts: chunks,
        })
      : []

    if (chunks.length > 0) {
      await db.insert(documentChunk).values(
        chunks.map((chunk, index) => ({
          documentId: doc.id,
          knowledgeBaseId: kb.id,
          sort: index,
          content: chunk,
          tokenCount: estimateTokens(chunk),
          contentHash: sha256(chunk),
          embedding: vectors[index],
        })),
      )
    }

    const tokenCount = chunks.reduce((sum, item) => sum + estimateTokens(item), 0)
    await db
      .update(document)
      .set({
        status: 'ready',
        chunks: chunks.length,
        chunkCount: chunks.length,
        tokenCount,
        errorMsg: null,
        errorMessage: null,
      })
      .where(eq(document.id, doc.id))

    if (shouldUpdateKbInventory) {
      await db
        .update(knowledgeBase)
        .set({
          documentCount: sql`${knowledgeBase.documentCount} + 1`,
          size: sql`${knowledgeBase.size} + ${doc.size}`,
          status: 'ready',
        })
        .where(eq(knowledgeBase.id, kb.id))
    }
    else {
      await db.update(knowledgeBase).set({ status: 'ready' }).where(eq(knowledgeBase.id, kb.id))
    }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : '处理失败'
    await db.update(document).set({ status: 'failed', errorMsg: message, errorMessage: message }).where(eq(document.id, doc.id))
  }
}

async function loadKnowledgeBase(kbOrId: string | typeof knowledgeBase.$inferSelect) {
  if (typeof kbOrId !== 'string')
    return kbOrId
  const [kb] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, kbOrId))
  return kb
}

export async function searchKnowledgeBase(
  kbOrId: string | typeof knowledgeBase.$inferSelect,
  query: string,
  topK = 5,
): Promise<KnowledgeSearchHit[]> {
  const kb = await loadKnowledgeBase(kbOrId)
  if (!kb)
    throw createError({ statusCode: 404, statusMessage: '知识库不存在' })

  const modelName = await resolveEmbeddingModelName(kb)
  const [queryVector] = await embedTextsViaGateway({
    organizationId: kb.organizationId,
    modelName,
    texts: [query],
  })
  if (!queryVector?.length)
    throw new Error('无法生成 query embedding')

  const requestedTopK = Math.max(1, topK)
  const candidateLimit = Math.max(requestedTopK * 5, (kb.topK ?? 5) * 5)
  const limit = kb.rerankModelId ? candidateLimit * 3 : candidateLimit
  const vectorLiteral = toVectorLiteral(queryVector)
  const result = await db.execute(sql`
    SELECT
      dc.id,
      dc.document_id AS "documentId",
      dc.knowledge_base_id AS "knowledgeBaseId",
      dc.sort,
      dc.content,
      dc.token_count AS "tokenCount",
      dc.content_hash AS "contentHash",
      dc.created_at AS "createdAt",
      1 - (dc.embedding <=> ${vectorLiteral}::vector) AS score
    FROM document_chunk dc
    ORDER BY dc.embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `)

  const rows = ((result as { rows?: Array<Record<string, unknown>> }).rows || []) as Array<Record<string, unknown>>
  const kbRows = rows.filter(row => row.knowledgeBaseId === kb.id).slice(0, candidateLimit)
  const reranked = await rerankCandidates(kb, query, kbRows, requestedTopK)
  return reranked.map(row => ({
    ...row,
    score: Number(Number(row.score || 0).toFixed(4)),
  })) as KnowledgeSearchHit[]
}

export async function rebuildKnowledgeBaseVectors(kbId: string) {
  await db.delete(documentChunk).where(eq(documentChunk.knowledgeBaseId, kbId))
  const docs = await db.select().from(document).where(eq(document.knowledgeBaseId, kbId))
  for (const doc of docs) {
    await db.update(document).set({ status: 'uploaded', errorMsg: null, errorMessage: null }).where(eq(document.id, doc.id))
    await processDocument(doc.id, { reindex: true })
  }
  return { total: docs.length }
}

export async function markInterruptedDocumentsFailed() {
  const stuckStatuses = ['parsing', 'chunking', 'embedding', 'uploaded'] as const
  const stuck = await db.select({ id: document.id }).from(document).where(inArray(document.status, [...stuckStatuses]))
  if (stuck.length === 0)
    return 0

  await db
    .update(document)
    .set({ status: 'failed', errorMsg: '服务重启，请重试', errorMessage: '服务重启，请重试' })
    .where(inArray(document.status, [...stuckStatuses]))
  return stuck.length
}

export async function recoverInterruptedDocuments() {
  return requeueInterruptedKnowledgeDocuments()
}
