import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSetResponseHeader = vi.fn()

vi.stubGlobal('setResponseHeader', mockSetResponseHeader)

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  prompt: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    content: 'content',
  },
  promptVersion: {
    id: 'id',
    promptId: 'promptId',
    version: 'version',
    content: 'content',
  },
}))

import promptImportHandler from '../prompt/import.post'
import promptExportHandler from '../prompt/export.get'
import promptPutHandler from '../prompt/[id].put'
import promptVersionsHandler from '../prompt/[id]/versions/index.get'
import promptRestoreHandler from '../prompt/[id]/versions/[versionId]/restore.post'

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createSelectWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }
}

function createVersionsSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createInsertChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
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

describe('aigate prompt extended handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('prompt import.post', () => {
    it('should reject non-array import data', async () => {
      const response = await promptImportHandler(createMockEvent({
        body: { items: 'not-an-array' },
      }))

      expect(response.code).toBe(400)
      expect(response.msg).toBe('无效的导入数据')
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject body that is not array or items wrapper', async () => {
      const response = await promptImportHandler(createMockEvent({
        body: { foo: 'bar' },
      }))

      expect(response.code).toBe(400)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should import valid items from array body', async () => {
      mockInsert.mockReturnValue(createInsertChain())

      const response = await promptImportHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1', userId: 'user-1' } },
        body: [
          { name: 'Prompt A', content: 'Hello {{name}}' },
          { name: 'Prompt B', content: 'World', category: 'onboarding', description: 'Desc' },
        ],
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ imported: 2, total: 2 })
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('should import from items wrapper in body', async () => {
      mockInsert.mockReturnValue(createInsertChain())

      const response = await promptImportHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: { items: [{ name: 'Wrapped', content: 'Content' }] },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ imported: 1, total: 1 })
    })

    it('should skip items missing name or content', async () => {
      mockInsert.mockReturnValue(createInsertChain())

      const response = await promptImportHandler(createMockEvent({
        body: [
          { name: 'Valid', content: 'OK' },
          { name: 'No content' },
          { content: 'No name' },
        ],
      }))

      expect(response.data).toEqual({ imported: 1, total: 3 })
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('prompt export.get', () => {
    it('should export prompts scoped to organization', async () => {
      const prompts = [{
        name: 'Test',
        description: 'Desc',
        content: 'Body',
        category: 'general',
        variables: [],
      }]
      mockSelect.mockReturnValue(createSelectChain(prompts))

      const event = createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      })
      const result = await promptExportHandler(event)

      expect(result).toEqual([{
        name: 'Test',
        description: 'Desc',
        content: 'Body',
        category: 'general',
        variables: [],
      }])
      expect(mockSetResponseHeader).toHaveBeenCalledWith(event, 'Content-Type', 'application/json')
      expect(mockSetResponseHeader).toHaveBeenCalledWith(event, 'Content-Disposition', 'attachment; filename="prompts-export.json"')
    })

    it('should export all prompts when principal has no organization', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue([]),
      })

      const result = await promptExportHandler(createMockEvent())

      expect(result).toEqual([])
    })
  })

  describe('prompt [id].put', () => {
    it('should return 404 when prompt not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await promptPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
        body: { name: 'Updated' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should update prompt without creating version when content unchanged', async () => {
      const existing = { id: 'p-1', content: 'Same content', name: 'Old' }
      const updated = { ...existing, name: 'New name' }
      mockSelect.mockReturnValue(createSelectChain([existing]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await promptPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1', userId: 'user-1' } },
        params: { id: 'p-1' },
        body: { name: 'New name' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create version snapshot when content changes', async () => {
      const existing = { id: 'p-1', content: 'Old content', name: 'Prompt' }
      const updated = { ...existing, content: 'New content' }
      mockSelect
        .mockReturnValueOnce(createSelectChain([existing]))
        .mockReturnValueOnce(createSelectWhereChain([{ version: 2 }]))
      mockInsert.mockReturnValue(createInsertChain())
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await promptPutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1', userId: 'user-1' } },
        params: { id: 'p-1' },
        body: { content: 'New content' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })

  describe('prompt [id]/versions index.get', () => {
    it('should return 404 when prompt not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await promptVersionsHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('Prompt 不存在')
    })

    it('should return version history for existing prompt', async () => {
      const versions = [
        { id: 'v-2', version: 2, content: 'v2' },
        { id: 'v-1', version: 1, content: 'v1' },
      ]
      mockSelect
        .mockReturnValueOnce(createSelectChain([{ id: 'p-1' }]))
        .mockReturnValueOnce(createVersionsSelectChain(versions))

      const response = await promptVersionsHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'p-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(versions)
    })
  })

  describe('prompt [id]/versions/[versionId] restore.post', () => {
    it('should return 404 when prompt not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await promptRestoreHandler(createMockEvent({
        params: { id: 'missing', versionId: 'v-1' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('Prompt 不存在')
    })

    it('should return 404 when version not found', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain([{ id: 'p-1', content: 'current' }]))
        .mockReturnValueOnce(createSelectChain([]))

      const response = await promptRestoreHandler(createMockEvent({
        params: { id: 'p-1', versionId: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('版本不存在')
    })

    it('should restore version content and snapshot current state', async () => {
      const prompt = { id: 'p-1', content: 'current content' }
      const version = { id: 'v-1', content: 'restored content', version: 1 }
      const restored = { ...prompt, content: 'restored content' }
      mockSelect
        .mockReturnValueOnce(createSelectChain([prompt]))
        .mockReturnValueOnce(createSelectChain([version]))
        .mockReturnValueOnce(createSelectWhereChain([{ version: 2 }]))
      mockInsert.mockReturnValue(createInsertChain())
      mockUpdate.mockReturnValue(createUpdateChain([restored]))

      const response = await promptRestoreHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1', userId: 'user-1' } },
        params: { id: 'p-1', versionId: 'v-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(restored)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })
  })
})
