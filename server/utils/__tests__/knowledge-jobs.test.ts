import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockCreateQueue, mockSend, mockStart, mockWork, mockSelect, mockUpdate, mockProcessDocument } = vi.hoisted(() => ({
  mockCreateQueue: vi.fn(),
  mockSend: vi.fn(),
  mockStart: vi.fn(),
  mockWork: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockProcessDocument: vi.fn(),
}))

class MockPgBoss {
  on = vi.fn()
  start = mockStart
  createQueue = mockCreateQueue
  send = mockSend
  work = mockWork
}

vi.mock('pg-boss', () => ({
  PgBoss: MockPgBoss,
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  document: {
    id: 'id',
    status: 'status',
    errorMsg: 'errorMsg',
    errorMessage: 'errorMessage',
  },
}))

vi.mock('#server/utils/knowledge-rag', () => ({
  processDocument: (...args: unknown[]) => mockProcessDocument(...args),
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

describe('knowledge jobs', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/aigate'
    mockStart.mockResolvedValue(new MockPgBoss())
    mockCreateQueue.mockResolvedValue(undefined)
    mockSend.mockResolvedValue('job-1')
    mockWork.mockResolvedValue('worker-1')
    mockProcessDocument.mockResolvedValue(undefined)
  })

  it('should create queue and enqueue document jobs', async () => {
    const { KNOWLEDGE_DOCUMENT_QUEUE, enqueueKnowledgeDocument } = await import('../knowledge-jobs')

    const jobId = await enqueueKnowledgeDocument('doc-1')

    expect(mockCreateQueue).toHaveBeenCalledWith(KNOWLEDGE_DOCUMENT_QUEUE, expect.objectContaining({
      retryLimit: 3,
      retryDelay: 30,
    }))
    expect(mockSend).toHaveBeenCalledWith(
      KNOWLEDGE_DOCUMENT_QUEUE,
      { documentId: 'doc-1', reindex: false },
      expect.objectContaining({ retryLimit: 3, retryDelay: 30 }),
    )
    expect(jobId).toBe('job-1')
  })

  it('should start worker that processes queued documents', async () => {
    const { startKnowledgeDocumentWorker } = await import('../knowledge-jobs')

    await startKnowledgeDocumentWorker()
    const handler = mockWork.mock.calls[0]?.[2] as (jobs: Array<{ data: { documentId: string, reindex?: boolean } }>) => Promise<void>
    await handler([{ data: { documentId: 'doc-1', reindex: true } }])

    expect(mockProcessDocument).toHaveBeenCalledWith('doc-1', { reindex: true })
  })

  it('should requeue interrupted documents', async () => {
    const { requeueInterruptedKnowledgeDocuments } = await import('../knowledge-jobs')
    mockSelect.mockReturnValueOnce(createSelectChain([{ id: 'doc-1' }, { id: 'doc-2' }]))
    mockUpdate.mockReturnValueOnce(createUpdateChain())

    const count = await requeueInterruptedKnowledgeDocuments()

    expect(count).toBe(2)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledTimes(2)
  })
})
