import { Buffer } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import kbDeleteHandler from '../knowledge-base/[id].delete'
import kbPutHandler from '../knowledge-base/[id].put'
import kbDocumentDeleteHandler from '../knowledge-base/[id]/documents/[docId].delete'
import kbDocumentsGetHandler from '../knowledge-base/[id]/documents/index.get'
import kbDocumentPostHandler from '../knowledge-base/[id]/documents/index.post'
import kbListHandler from '../knowledge-base/index.get'
import kbPostHandler from '../knowledge-base/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockSaveUploadedDocument = vi.fn()
const mockAuditLog = vi.fn()
const mockSetResponseStatus = vi.fn()

const knowledgeBaseBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  organizationId: z.string().optional(),
  ownerId: z.string().optional(),
  embeddingModel: z.string().optional(),
  storageInstanceId: z.string().optional(),
  embeddingModelId: z.string().optional(),
  embeddingDim: z.number().optional(),
  chunkSize: z.number().optional(),
  chunkOverlap: z.number().optional(),
  topK: z.number().optional(),
  dedupStrategy: z.string().optional(),
  documentCount: z.number().optional(),
  size: z.number().optional(),
  status: z.string().optional(),
  enabled: z.boolean().optional(),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  knowledgeBase: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    ownerId: 'ownerId',
    createdAt: 'createdAt',
    documentCount: 'documentCount',
    size: 'size',
    status: 'status',
    storageInstanceId: 'storageInstanceId',
    embeddingModelId: 'embeddingModelId',
    embeddingDim: 'embeddingDim',
    chunkSize: 'chunkSize',
    chunkOverlap: 'chunkOverlap',
    topK: 'topK',
    dedupStrategy: 'dedupStrategy',
    enabled: 'enabled',
  },
  storageInstance: {
    id: 'id',
    isDefault: 'isDefault',
  },
  aiModel: {
    id: 'id',
    name: 'name',
  },
  document: {
    id: 'id',
    knowledgeBaseId: 'knowledgeBaseId',
    name: 'name',
    type: 'type',
    size: 'size',
    status: 'status',
    chunks: 'chunks',
    chunkCount: 'chunkCount',
    tokenCount: 'tokenCount',
    contentHash: 'contentHash',
    metadata: 'metadata',
    createdAt: 'createdAt',
  },
  insertKnowledgeBaseSchema: {
    parse: (body: unknown) => knowledgeBaseBodySchema.parse(body),
  },
  updateKnowledgeBaseSchema: {
    parse: (body: unknown) => knowledgeBaseBodySchema.partial().parse(body),
  },
}))

vi.mock('#server/utils/knowledge-rag', () => ({
  saveUploadedDocument: (...args: unknown[]) => mockSaveUploadedDocument(...args),
}))

const mockProbeEmbeddingDim = vi.fn()

vi.mock('#server/utils/knowledge-embedding', () => ({
  probeEmbeddingDim: (...args: unknown[]) => mockProbeEmbeddingDim(...args),
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

vi.stubGlobal('readMultipartFormData', async (event: { _formData?: unknown }) => event._formData)
vi.stubGlobal('setResponseStatus', (...args: unknown[]) => mockSetResponseStatus(...args))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createLimitedSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createListSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createCountSelectChain(total: number) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ total }]),
    }),
  }
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createFileFormData(
  options: {
    filename?: string
    type?: string
    data?: Buffer
    chunkSize?: string
  } = {},
) {
  const data = options.data ?? Buffer.from('hello world')
  return [
    {
      name: 'file',
      filename: options.filename ?? 'notes.txt',
      type: options.type ?? 'text/plain',
      data,
    },
    ...(options.chunkSize ? [{ name: 'chunkSize', data: Buffer.from(options.chunkSize) }] : []),
  ]
}

describe('aigate knowledge-base handlers', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuditLog.mockResolvedValue(undefined)
    mockProbeEmbeddingDim.mockResolvedValue(1536)
    mockSetResponseStatus.mockReset()
  })

  describe('knowledge-base index.post', () => {
    it('should reject invalid body missing required name', async () => {
      const response = await kbPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { description: 'No name' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create knowledge base with organization from principal', async () => {
      const created = { id: 'kb-1', name: 'Product Docs', organizationId: 'org-1' }
      mockSelect.mockReturnValue(createLimitedSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await kbPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Product Docs' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should create knowledge base preserving explicit organizationId', async () => {
      const response = await kbPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Shared KB', organizationId: 'org-explicit' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should allow admin to create knowledge base with explicit organizationId', async () => {
      const created = { id: 'kb-2', name: 'Shared KB', organizationId: 'org-explicit' }
      mockSelect.mockReturnValue(createLimitedSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await kbPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { name: 'Shared KB', organizationId: 'org-explicit' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })

    it('should write audit log after creating knowledge base', async () => {
      const created = { id: 'kb-audit', name: 'Audit KB', organizationId: 'org-1' }
      mockSelect.mockReturnValue(createLimitedSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([created]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { name: 'Audit KB' },
      })
      const response = await kbPostHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'knowledge_base.create',
        { type: 'knowledge_base', id: 'kb-audit' },
        null,
        created,
      )
    })

    it('should probe embedding dimension when embeddingModelId is provided', async () => {
      const created = { id: 'kb-embed', name: 'Embed KB', organizationId: 'org-1', embeddingDim: 1536 }
      mockSelect
        .mockReturnValueOnce(createLimitedSelectChain([]))
        .mockReturnValueOnce(createLimitedSelectChain([{ id: 'model-1', name: 'text-embedding-3-small' }]))
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await kbPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Embed KB', embeddingModelId: 'model-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockProbeEmbeddingDim).toHaveBeenCalledWith('org-1', 'text-embedding-3-small')
    })

    it('should reject non-admin principals without organization context', async () => {
      const response = await kbPostHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
          body: { name: 'No Org KB' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('knowledge-base index.get', () => {
    it('should scope list to principal organization', async () => {
      const items = [{ id: 'kb-1', name: 'Org KB', organizationId: 'org-1' }]
      mockSelect.mockReturnValueOnce(createCountSelectChain(items.length)).mockReturnValueOnce(createListSelectChain(items))

      const response = await kbListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ items, total: items.length })
    })

    it('should filter by keyword query', async () => {
      const items = [{ id: 'kb-2', name: 'API Reference' }]
      mockSelect.mockReturnValueOnce(createCountSelectChain(items.length)).mockReturnValueOnce(createListSelectChain(items))

      const response = await kbListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          query: { keyword: 'API' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ items, total: items.length })
    })

    it('should reject non-admin principals without organization context', async () => {
      const response = await kbListHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should allow admin to list all knowledge bases without organization context', async () => {
      const items = [{ id: 'kb-3', name: 'Global KB' }]
      mockSelect.mockReturnValueOnce(createCountSelectChain(items.length)).mockReturnValueOnce(createListSelectChain(items))

      const response = await kbListHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ items, total: items.length })
    })
  })

  describe('knowledge-base [id].put', () => {
    it('should reject non-admin principals without organization context', async () => {
      const response = await kbPutHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
          params: { id: 'kb-1' },
          body: { name: 'Updated' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should return 404 when knowledge base not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await kbPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
          body: { name: 'Updated' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should update knowledge base scoped to organization', async () => {
      const updated = { id: 'kb-1', name: 'Renamed KB', organizationId: 'org-1' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await kbPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
          body: { name: 'Renamed KB' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should not update embedding fields after knowledge base creation', async () => {
      const updated = { id: 'kb-1', name: 'Renamed KB', organizationId: 'org-1', embeddingModelId: 'embed-old', embeddingDim: 1536 }
      const set = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      })
      mockUpdate.mockReturnValue({ set })

      const response = await kbPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
          body: {
            name: 'Renamed KB',
            embeddingModel: 'text-embedding-3-large',
            embeddingModelId: 'embed-new',
            embeddingDim: 3072,
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(set).toHaveBeenCalledWith({ name: 'Renamed KB' })
    })

    it('should write audit log with before and after when updating knowledge base', async () => {
      const before = { id: 'kb-audit', name: 'Before KB', organizationId: 'org-1' }
      const updated = { id: 'kb-audit', name: 'After KB', organizationId: 'org-1' }
      mockSelect.mockReturnValue(createSelectChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'kb-audit' },
        body: { name: 'After KB' },
      })
      const response = await kbPutHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'knowledge_base.update',
        { type: 'knowledge_base', id: 'kb-audit' },
        before,
        updated,
      )
    })
  })

  describe('knowledge-base [id].delete', () => {
    it('should reject non-admin principals without organization context', async () => {
      const response = await kbDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: null } },
          params: { id: 'kb-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should return 404 when knowledge base not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await kbDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should delete knowledge base scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'kb-1' }]))

      const response = await kbDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should write audit log when deleting knowledge base', async () => {
      const deleted = { id: 'kb-audit', name: 'Audit KB', organizationId: 'org-1' }
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const event = createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        params: { id: 'kb-audit' },
      })
      const response = await kbDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'knowledge_base.delete',
        { type: 'knowledge_base', id: 'kb-audit' },
        deleted,
        null,
      )
    })
  })

  describe('knowledge-base [id]/documents index.get', () => {
    it('should return error when knowledge base id is missing', async () => {
      const response = await kbDocumentsGetHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect((response.data as Error).message).toBe('Missing knowledge base ID')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return error when knowledge base not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await kbDocumentsGetHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.NOT_FOUND)
      expect((response.data as Error).message).toBe('Knowledge base not found')
    })

    it('should return documents for existing knowledge base', async () => {
      const kb = {
        id: 'kb-1',
        name: 'Docs KB',
        organizationId: 'org-1',
        status: 'ready',
      }
      const documents = [
        { id: 'doc-1', name: 'guide.pdf' },
        { id: 'doc-2', name: 'faq.md' },
      ]
      mockSelect.mockReturnValueOnce(createSelectChain([kb])).mockReturnValueOnce(createListSelectChain(documents))

      const response = await kbDocumentsGetHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(documents)
    })

    it('should reject documents list outside principal organization', async () => {
      mockSelect.mockReturnValue(
        createSelectChain([
          {
            id: 'kb-1',
            name: 'Docs KB',
            organizationId: 'org-other',
            status: 'ready',
          },
        ]),
      )

      const response = await kbDocumentsGetHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('无权操作此知识库')
    })
  })

  describe('knowledge-base [id]/documents index.post', () => {
    it('should reject when knowledge base id is missing', async () => {
      const response = await kbDocumentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          _formData: createFileFormData(),
        }),
      )

      expect(response.msg).toBe('缺少知识库 ID')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject when knowledge base not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await kbDocumentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
          _formData: createFileFormData(),
        }),
      )

      expect(response.msg).toBe('知识库不存在')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject when principal cannot access knowledge base', async () => {
      mockSelect.mockReturnValue(
        createSelectChain([
          {
            id: 'kb-1',
            organizationId: 'org-other',
          },
        ]),
      )

      const response = await kbDocumentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
          _formData: createFileFormData(),
        }),
      )

      expect(response.msg).toBe('无权操作此知识库')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject unsupported file type', async () => {
      mockSelect.mockReturnValue(
        createSelectChain([
          {
            id: 'kb-1',
            organizationId: 'org-1',
          },
        ]),
      )

      const response = await kbDocumentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
          _formData: createFileFormData({ type: 'image/png' }),
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ name: 'notes.txt', success: false, error: '不支持的文件类型' })
      expect(mockSaveUploadedDocument).not.toHaveBeenCalled()
    })

    it('should upload valid file and update knowledge base stats', async () => {
      const fileData = Buffer.from('document content')
      const insertedDoc = {
        id: 'doc-1',
        name: 'notes.txt',
        type: 'text/plain',
        size: fileData.byteLength,
        status: 'ready',
      }
      mockSelect.mockReturnValue(
        createSelectChain([
          {
            id: 'kb-1',
            organizationId: 'org-1',
          },
        ]),
      )
      mockSaveUploadedDocument.mockResolvedValue(insertedDoc)

      const response = await kbDocumentPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
          _formData: createFileFormData({ data: fileData, chunkSize: '500' }),
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        success: true,
        document: insertedDoc,
      })
      expect(mockSaveUploadedDocument).toHaveBeenCalledTimes(1)
      expect(mockSetResponseStatus).toHaveBeenCalledWith(expect.anything(), 202)
    })
  })

  describe('knowledge-base [id]/documents/[docId].delete', () => {
    it('should return error when parameters are missing', async () => {
      const response = await kbDocumentDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect((response.data as Error).message).toBe('Missing parameters')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return error when knowledge base not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await kbDocumentDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing', docId: 'doc-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.NOT_FOUND)
      expect((response.data as Error).message).toBe('Knowledge base not found')
    })

    it('should confirm document deletion for existing knowledge base', async () => {
      mockSelect.mockReturnValue(createSelectChain([{ id: 'kb-1', name: 'Docs KB', organizationId: 'org-1' }]))

      const response = await kbDocumentDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1', docId: 'doc-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ message: 'Document deleted', docId: 'doc-1' })
    })

    it('should reject document deletion outside principal organization', async () => {
      mockSelect.mockReturnValue(createSelectChain([{ id: 'kb-1', name: 'Docs KB', organizationId: 'org-other' }]))

      const response = await kbDocumentDeleteHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1', docId: 'doc-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('无权操作此知识库')
    })
  })
})
