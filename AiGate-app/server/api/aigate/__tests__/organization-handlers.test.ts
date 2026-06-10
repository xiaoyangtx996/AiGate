import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import orgPutHandler from '../organization/[id].put'

import orgPostHandler from '../organization/index.post'
import orgTreeHandler from '../organization/tree.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

const insertOrgBodySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  level: z.enum(['group', 'company', 'department', 'team']).optional(),
  tokenLimit: z.number().optional(),
})

const updateOrgBodySchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  level: z.enum(['group', 'company', 'department', 'team']).optional(),
  tokenLimit: z.number().optional(),
  tokenUsed: z.number().optional(),
  enabled: z.boolean().optional(),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: {
    id: 'id',
    name: 'name',
    parentId: 'parentId',
    level: 'level',
    tokenLimit: 'tokenLimit',
    tokenUsed: 'tokenUsed',
  },
  insertOrgSchema: {
    parse: (body: unknown) => insertOrgBodySchema.parse(body),
  },
  updateOrgSchema: {
    parse: (body: unknown) => updateOrgBodySchema.parse(body),
  },
}))

interface OrgRow {
  id: string
  name: string
  parentId: string | null
  level: string
  tokenLimit: number
  tokenUsed: number
  children?: OrgRow[]
}

function buildTree(orgs: OrgRow[], parentId: string | null = null): OrgRow[] {
  return orgs
    .filter(o => o.parentId === parentId)
    .map(o => ({
      ...o,
      children: buildTree(orgs, o.id),
    }))
}

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(result),
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

describe('aigate organization handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildTree helper', () => {
    it('should nest children under correct parents', () => {
      const flat: OrgRow[] = [
        { id: 'root', name: 'Group', parentId: null, level: 'group', tokenLimit: 0, tokenUsed: 0 },
        { id: 'dept', name: 'Engineering', parentId: 'root', level: 'department', tokenLimit: 1000, tokenUsed: 200 },
        { id: 'proj', name: 'AiGate', parentId: 'dept', level: 'project', tokenLimit: 500, tokenUsed: 100 },
      ]

      expect(buildTree(flat)).toEqual([
        {
          ...flat[0],
          children: [
            {
              ...flat[1],
              children: [{ ...flat[2], children: [] }],
            },
          ],
        },
      ])
    })

    it('should return multiple roots when parentId is null', () => {
      const flat: OrgRow[] = [
        { id: 'a', name: 'A', parentId: null, level: 'company', tokenLimit: 0, tokenUsed: 0 },
        { id: 'b', name: 'B', parentId: null, level: 'company', tokenLimit: 0, tokenUsed: 0 },
      ]

      expect(buildTree(flat)).toHaveLength(2)
    })
  })

  describe('organization tree.get', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgTreeHandler(createMockEvent({
        context: { principal: { isAdmin: false } },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return flat list when flat=true', async () => {
      const orgs = [
        { id: 'org-1', name: 'HQ', parentId: null, level: 'company', tokenLimit: 0, tokenUsed: 0 },
      ]
      mockSelect.mockReturnValue(createSelectChain(orgs))

      const response = await orgTreeHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        query: { flat: 'true' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(orgs)
    })

    it('should return nested tree by default', async () => {
      const orgs = [
        { id: 'root', name: 'Group', parentId: null, level: 'group', tokenLimit: 0, tokenUsed: 0 },
        { id: 'child', name: 'Team', parentId: 'root', level: 'department', tokenLimit: 100, tokenUsed: 10 },
      ]
      mockSelect.mockReturnValue(createSelectChain(orgs))

      const response = await orgTreeHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(buildTree(orgs as OrgRow[]))
    })

    it('should return empty list when no organizations exist', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await orgTreeHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        query: { flat: 'true' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual([])
    })
  })

  describe('organization index.post', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgPostHandler(createMockEvent({
        context: { principal: { isAdmin: false } },
        body: { name: 'HQ' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body missing name', async () => {
      const response = await orgPostHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { level: 'company' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create organization with parsed body', async () => {
      const created = {
        id: 'org-new',
        name: 'HQ',
        parentId: null,
        level: 'company',
        tokenLimit: 1000,
        tokenUsed: 0,
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await orgPostHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { name: 'HQ', level: 'company', tokenLimit: 1000 },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should create child organization with parentId', async () => {
      const created = {
        id: 'org-child',
        name: 'Engineering',
        parentId: 'org-root',
        level: 'department',
        tokenLimit: 500,
        tokenUsed: 0,
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await orgPostHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { name: 'Engineering', parentId: 'org-root', level: 'department', tokenLimit: 500 },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })
  })

  describe('organization [id].put', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgPutHandler(createMockEvent({
        context: { principal: { isAdmin: false } },
        params: { id: 'org-1' },
        body: { name: 'Forbidden' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should reject invalid body with bad level', async () => {
      const response = await orgPutHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'org-1' },
        body: { level: 'invalid-level' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should update organization fields by id', async () => {
      const updated = {
        id: 'org-1',
        name: 'Renamed HQ',
        parentId: null,
        level: 'company',
        tokenLimit: 2000,
        tokenUsed: 100,
      }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await orgPutHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'org-1' },
        body: { name: 'Renamed HQ', tokenLimit: 2000 },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should return undefined data when organization id is not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await orgPutHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'missing' },
        body: { name: 'Ghost Org' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeUndefined()
    })
  })
})
