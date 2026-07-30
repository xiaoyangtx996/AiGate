import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDelete, mockInsert, mockSelect, mockUpdate, mockExecute, mockEmbedTextsViaGateway, mockEnqueueKnowledgeDocument } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockExecute: vi.fn(),
  mockEmbedTextsViaGateway: vi.fn(),
  mockEnqueueKnowledgeDocument: vi.fn(),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    delete: (...args: unknown[]) => mockDelete(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
  },
}))

vi.mock('#server/utils/knowledge-embedding', () => ({
  embedTextsViaGateway: (...args: unknown[]) => mockEmbedTextsViaGateway(...args),
}))

vi.mock('#server/utils/knowledge-jobs', () => ({
  enqueueKnowledgeDocument: (...args: unknown[]) => mockEnqueueKnowledgeDocument(...args),
  requeueInterruptedKnowledgeDocuments: vi.fn().mockResolvedValue(0),
}))

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('first chunk content for testing')),
}))

vi.mock('@/db/schema', () => ({
  aiModel: { id: 'aiModel.id', name: 'aiModel.name' },
  document: {
    id: 'document.id',
    knowledgeBaseId: 'document.knowledgeBaseId',
    path: 'document.path',
    type: 'document.type',
    status: 'document.status',
    metadata: 'document.metadata',
    size: 'document.size',
  },
  documentChunk: {
    documentId: 'documentChunk.documentId',
    knowledgeBaseId: 'documentChunk.knowledgeBaseId',
  },
  knowledgeBase: {
    documentCount: 'knowledgeBase.documentCount',
    id: 'knowledgeBase.id',
    size: 'knowledgeBase.size',
    embeddingModel: 'knowledgeBase.embeddingModel',
    embeddingModelId: 'knowledgeBase.embeddingModelId',
    organizationId: 'knowledgeBase.organizationId',
    chunkSize: 'knowledgeBase.chunkSize',
    chunkOverlap: 'knowledgeBase.chunkOverlap',
    topK: 'knowledgeBase.topK',
    rerankModelId: 'knowledgeBase.rerankModelId',
  },
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

describe('knowledge rag utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnqueueKnowledgeDocument.mockResolvedValue('job-1')
    mockEmbedTextsViaGateway.mockImplementation(async ({ texts }: { texts: string[] }) =>
      texts.map(() => [0.1, 0.2, 0.3]),
    )
  })

  it('should enqueue uploaded document for background processing', async () => {
    const { saveUploadedDocument } = await import('../knowledge-rag')
    const created = { id: 'doc-1', status: 'uploaded' }

    mockSelect.mockReturnValueOnce(createSelectChain([]))
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([created]),
      }),
    })

    const result = await saveUploadedDocument({
      kb: { id: 'kb-1', dedupStrategy: 'reject' } as never,
      fileName: 'notes.txt',
      fileType: 'text/plain',
      data: Buffer.from('hello world'),
    })

    expect(result).toEqual(created)
    expect(mockEnqueueKnowledgeDocument).toHaveBeenCalledWith('doc-1')
  })

  it('should embed document chunks via gateway when processing documents', async () => {
    const { processDocument } = await import('../knowledge-rag')
    const insertedValues = vi.fn().mockResolvedValue(undefined)

    mockSelect
      .mockReturnValueOnce(
        createSelectChain([
          {
            id: 'doc-1',
            knowledgeBaseId: 'kb-1',
            type: 'text/plain',
            path: '/tmp/doc.txt',
            metadata: { rawText: 'first chunk content for testing pipeline' },
            size: 42,
            status: 'uploaded',
          },
        ]),
      )
      .mockReturnValueOnce(
        createSelectChain([
          {
            id: 'kb-1',
            chunkSize: 1000,
            chunkOverlap: 200,
            embeddingDim: 1536,
            embeddingModel: 'text-embedding-3-small',
            organizationId: 'org-1',
          },
        ]),
      )
    mockUpdate.mockReturnValue(createUpdateChain())
    mockDelete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    mockInsert.mockReturnValue({ values: insertedValues })

    await processDocument('doc-1')

    expect(mockEmbedTextsViaGateway).toHaveBeenCalled()
    expect(insertedValues).toHaveBeenCalledWith([
      expect.objectContaining({
        embedding: [0.1, 0.2, 0.3],
      }),
    ])
  })

  it('should query pgvector for semantic search', async () => {
    const { searchKnowledgeBase } = await import('../knowledge-rag')

    mockSelect.mockReturnValueOnce(createSelectChain([]))
    mockExecute.mockResolvedValue({
      rows: [{ id: 'chunk-1', knowledgeBaseId: 'kb-1', content: 'hello world', score: 0.91 }],
    })

    const hits = await searchKnowledgeBase(
      {
        id: 'kb-1',
        organizationId: 'org-1',
        embeddingModel: 'text-embedding-3-small',
        topK: 5,
      } as never,
      'hello',
      3,
    )

    expect(mockEmbedTextsViaGateway).toHaveBeenCalled()
    expect(mockExecute).toHaveBeenCalled()
    expect(hits[0]?.content).toBe('hello world')
  })

  it('should oversample global vector candidates and filter back to target knowledge base', async () => {
    const { searchKnowledgeBase } = await import('../knowledge-rag')

    mockSelect.mockReturnValueOnce(createSelectChain([]))
    mockExecute.mockResolvedValue({
      rows: [
        { id: 'other-1', knowledgeBaseId: 'kb-other', content: 'wrong kb', score: 0.99 },
        { id: 'chunk-1', knowledgeBaseId: 'kb-1', content: 'target one', score: 0.91 },
        { id: 'other-2', knowledgeBaseId: 'kb-other', content: 'wrong kb 2', score: 0.9 },
        { id: 'chunk-2', knowledgeBaseId: 'kb-1', content: 'target two', score: 0.88 },
      ],
    })

    const hits = await searchKnowledgeBase(
      {
        id: 'kb-1',
        organizationId: 'org-1',
        embeddingModel: 'text-embedding-3-small',
        topK: 2,
      } as never,
      'target',
      2,
    )

    expect(hits).toHaveLength(2)
    expect(hits.map(hit => hit.id)).toEqual(['chunk-1', 'chunk-2'])
    expect(hits[0]?.score).toBe(0.91)
  })
})
