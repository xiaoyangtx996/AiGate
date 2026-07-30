import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import skillFilePutHandler from '../skill/[id]/files/[fileId].put'
import skillFilePostHandler from '../skill/[id]/files/index.post'
import skillImportHandler from '../skill/import.post'
import { asResponse, createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  skill: {
    id: 'id',
    organizationId: 'organizationId',
    version: 'version',
  },
  skillFile: {
    id: 'id',
    skillId: 'skillId',
    path: 'path',
  },
}))

vi.stubGlobal('getHeader', () => '')

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createInsertChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result)
  const values = vi.fn().mockReturnValue({ returning })
  return { chain: { values }, values, returning }
}

function createUpdateChain(result: unknown[] = []) {
  const returning = vi.fn().mockResolvedValue(result)
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  return { chain: { set }, set, where, returning }
}

function mockImportTransaction(created: Record<string, unknown>, insertedFiles: Record<string, unknown>[] = []) {
  const skillInsert = createInsertChain([created])
  const fileInsert = createInsertChain(insertedFiles)
  const txInsert = vi.fn()
    .mockReturnValueOnce(skillInsert.chain)
    .mockReturnValueOnce(fileInsert.chain)

  mockTransaction.mockImplementationOnce(async (callback: (tx: { insert: typeof txInsert }) => unknown) => {
    return callback({ insert: txInsert })
  })

  return { skillInsert, fileInsert }
}

describe('aigate skill handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('skill import.post', () => {
    it('should reject imports without SKILL.md', async () => {
      const response = await skillImportHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: {
          files: [{ path: 'README.md', content: '# Readme' }],
        },
      }))

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toBe('SKILL.md is required')
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('should reject binary files', async () => {
      const response = await skillImportHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: {
          files: [
            { path: 'SKILL.md', content: '# Skill' },
            { path: 'icon.png', content: 'not really text' },
          ],
        },
      }))

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(response.msg).toBe('Binary file is not allowed: icon.png')
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('should import SKILL.md frontmatter and extra text files', async () => {
      const content = '---\nname: Writer\ndescription: Draft assistant\n---\n\n# Writer\n'
      const created = {
        id: 'skill-1',
        organizationId: 'org-1',
        name: 'Writer',
        description: 'Draft assistant',
        content,
        hasFiles: true,
      }
      const insertedFiles = [{ id: 'file-1', skillId: 'skill-1', path: 'docs/guide.md', content: '# Guide' }]
      const { skillInsert, fileInsert } = mockImportTransaction(created, insertedFiles)
      mockSelect.mockReturnValueOnce(createSelectChain([{ ...created, version: 1 }]))

      const response = asResponse<any>(await skillImportHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: {
          files: [
            { path: 'SKILL.md', content },
            { path: 'docs/guide.md', content: '# Guide' },
          ],
        },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(skillInsert.values).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'org-1',
        name: 'Writer',
        description: 'Draft assistant',
        content,
        hasFiles: true,
        enabled: true,
      }))
      expect(fileInsert.values).toHaveBeenCalledWith([
        { skillId: 'skill-1', path: 'docs/guide.md', content: '# Guide' },
      ])
      expect(response.data.files).toEqual([
        { id: 'skill-md', skillId: 'skill-1', path: 'SKILL.md', content },
        insertedFiles[0],
      ])
      expect(response.data.version).toBe(1)
    })
  })

  describe('skill files handlers', () => {
    it('should increment version when adding a support file', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain([{ id: 'skill-1', organizationId: 'org-1', version: 3 }]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValueOnce(createInsertChain([{ id: 'file-1', skillId: 'skill-1', path: 'docs/a.md', content: '# A' }]).chain)
      const update = createUpdateChain()
      mockUpdate.mockReturnValueOnce(update.chain)

      const response = await skillFilePostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'skill-1' },
        body: { path: 'docs/a.md', content: '# A' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(update.set).toHaveBeenCalledWith(expect.objectContaining({
        hasFiles: true,
        version: expect.anything(),
      }))
    })

    it('should sync SKILL.md frontmatter and increment version when saving the primary file', async () => {
      const content = '---\nname: Updated Skill\ndescription: Updated description\n---\n\n# Body\n'
      mockSelect.mockReturnValueOnce(createSelectChain([{ id: 'skill-1', organizationId: 'org-1', version: 7 }]))
      const update = createUpdateChain([{ id: 'skill-1', content, name: 'Updated Skill', description: 'Updated description', version: 8 }])
      mockUpdate.mockReturnValueOnce(update.chain)

      const response = asResponse<any>(await skillFilePutHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'skill-1', fileId: 'skill-md' },
        body: { content },
      })))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(update.set).toHaveBeenCalledWith({
        content,
        name: 'Updated Skill',
        description: 'Updated description',
        version: 8,
      })
      expect(response.data).toEqual({
        id: 'skill-md',
        skillId: 'skill-1',
        path: 'SKILL.md',
        content,
        primary: true,
      })
    })
  })
})
