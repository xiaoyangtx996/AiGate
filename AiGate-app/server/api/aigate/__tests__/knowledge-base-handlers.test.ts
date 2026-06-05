import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

const knowledgeBaseBodySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  organizationId: z.string().optional(),
  embeddingModel: z.string().optional(),
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
    createdAt: 'createdAt',
    documentCount: 'documentCount',
    size: 'size',
    status: 'status',
  },
  document: {
    id: 'id',
    knowledgeBaseId: 'knowledgeBaseId',
    name: 'name',
    type: 'type',
    size: 'size',
    status: 'status',
    chunks: 'chunks',
    metadata: 'metadata',
  },
  insertKnowledgeBaseSchema: {
    parse: (body: unknown) => knowledgeBaseBodySchema.parse(body),
  },
}))

vi.stubGlobal('readMultipartFormData', async (event: { _formData?: unknown }) => event._formData)

import kbPostHandler from '../knowledge-base/index.post'
import kbListHandler from '../knowledge-base/index.get'
import kbPutHandler from '../knowledge-base/[id].put'
import kbDeleteHandler from '../knowledge-base/[id].delete'
import kbDocumentsGetHandler from '../knowledge-base/[id]/documents/index.get'
import kbDocumentPostHandler from '../knowledge-base/[id]/documents/index.post'
import kbDocumentDeleteHandler from '../knowledge-base/[id]/documents/[docId].delete'

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
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

function createUpdateChainNoReturn() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
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

function createFileFormData(options: {
  filename?: string
  type?: string
  data?: Buffer
  chunkSize?: string
} = {}) {
  const data = options.data ?? Buffer.from('hello world')
  return [
    {
      name: 'file',
      filename: options.filename ?? 'notes.txt',
      type: options.type ?? 'text/plain',
      data,
    },
    ...(options.chunkSize
      ? [{ name: 'chunkSize', data: Buffer.from(options.chunkSize) }]
      : []),
  ]
}

describe('aigate knowledge-base handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('knowledge-base index.post', () => {
    it('should reject invalid body missing required name', async () => {
      const response = await kbPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { description: 'No name' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create knowledge base with organization from principal', async () => {
      const created = { id: 'kb-1', name: 'Product Docs', organizationId: 'org-1' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await kbPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { name: 'Product Docs' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should create knowledge base preserving explicit organizationId', async () => {
      const created = { id: 'kb-2', name: 'Shared KB', organizationId: 'org-explicit' }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await kbPostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { name: 'Shared KB', organizationId: 'org-explicit' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })
  })

  describe('knowledge-base index.get', () => {
    it('should scope list to principal organization', async () => {
      const items = [{ id: 'kb-1', name: 'Org KB', organizationId: 'org-1' }]
      mockSelect.mockReturnValue(createListSelectChain(items))

      const response = await kbListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(items)
    })

    it('should filter by keyword query', async () => {
      const items = [{ id: 'kb-2', name: 'API Reference' }]
      mockSelect.mockReturnValue(createListSelectChain(items))

      const response = await kbListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        query: { keyword: 'API' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(items)
    })

    it('should return all knowledge bases when principal has no organization', async () => {
      const items = [{ id: 'kb-3', name: 'Global KB' }]
      mockSelect.mockReturnValue(createListSelectChain(items))

      const response = await kbListHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(items)
    })
  })

  describe('knowledge-base [id].put', () => {
    it('should return 404 when knowledge base not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await kbPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
        body: { name: 'Updated' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should update knowledge base scoped to organization', async () => {
      const updated = { id: 'kb-1', name: 'Renamed KB', organizationId: 'org-1' }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await kbPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'kb-1' },
        body: { name: 'Renamed KB' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('knowledge-base [id].delete', () => {
    it('should return 404 when knowledge base not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await kbDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should delete knowledge base scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'kb-1' }]))

      const response = await kbDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'kb-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('knowledge-base [id]/documents index.get', () => {
    it('should return error when knowledge base id is missing', async () => {
      const response = await kbDocumentsGetHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Missing knowledge base ID')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return error when knowledge base not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await kbDocumentsGetHandler(createMockEvent({
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Knowledge base not found')
    })

    it('should return documents for existing knowledge base', async () => {
      const kb = {
        id: 'kb-1',
        name: 'Docs KB',
        status: 'ready',
        documents: [
          { id: 'doc-1', name: 'guide.pdf' },
          { id: 'doc-2', name: 'faq.md' },
        ],
      }
      mockSelect.mockReturnValue(createSelectChain([kb]))

      const response = await kbDocumentsGetHandler(createMockEvent({
        params: { id: 'kb-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        knowledgeBase: { id: 'kb-1', name: 'Docs KB', status: 'ready' },
        documents: kb.documents,
        total: 2,
      })
    })
  })

  describe('knowledge-base [id]/documents index.post', () => {
    it('should reject when knowledge base id is missing', async () => {
      const response = await kbDocumentPostHandler(createMockEvent({
        _formData: createFileFormData(),
      } as ReturnType<typeof createMockEvent>))

      expect(response.msg).toBe('缺少知识库 ID')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject when knowledge base not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await kbDocumentPostHandler({
        ...createMockEvent({ params: { id: 'missing' } }),
        _formData: createFileFormData(),
      })

      expect(response.msg).toBe('知识库不存在')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject when principal cannot access knowledge base', async () => {
      mockSelect.mockReturnValue(createSelectChain([{
        id: 'kb-1',
        organizationId: 'org-other',
      }]))

      const response = await kbDocumentPostHandler({
        ...createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
        _formData: createFileFormData(),
      })

      expect(response.msg).toBe('无权操作此知识库')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject unsupported file type', async () => {
      mockSelect.mockReturnValue(createSelectChain([{
        id: 'kb-1',
        organizationId: 'org-1',
      }]))

      const response = await kbDocumentPostHandler({
        ...createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
        _formData: createFileFormData({ type: 'image/png' }),
      })

      expect(response.msg).toBe('不支持的文件类型')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should upload valid file and update knowledge base stats', async () => {
      const fileData = Buffer.from('document content')
      const insertedDoc = {
        id: 'doc-1',
        name: 'notes.txt',
        type: 'text/plain',
        size: fileData.byteLength,
        status: 'processing',
      }
      mockSelect.mockReturnValue(createSelectChain([{
        id: 'kb-1',
        organizationId: 'org-1',
      }]))
      mockInsert.mockReturnValue(createInsertChain([insertedDoc]))
      mockUpdate.mockReturnValue(createUpdateChainNoReturn())

      const response = await kbDocumentPostHandler({
        ...createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'kb-1' },
        }),
        _formData: createFileFormData({ data: fileData, chunkSize: '500' }),
      })

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({
        id: 'doc-1',
        name: 'notes.txt',
        size: fileData.byteLength,
        type: 'text/plain',
        status: 'processing',
      })
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('knowledge-base [id]/documents/[docId].delete', () => {
    it('should return error when parameters are missing', async () => {
      const response = await kbDocumentDeleteHandler(createMockEvent({
        params: { id: 'kb-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Missing parameters')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return error when knowledge base not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await kbDocumentDeleteHandler(createMockEvent({
        params: { id: 'missing', docId: 'doc-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Knowledge base not found')
    })

    it('should confirm document deletion for existing knowledge base', async () => {
      mockSelect.mockReturnValue(createSelectChain([{ id: 'kb-1', name: 'Docs KB' }]))

      const response = await kbDocumentDeleteHandler(createMockEvent({
        params: { id: 'kb-1', docId: 'doc-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ message: 'Document deleted', docId: 'doc-1' })
    })
  })
})
