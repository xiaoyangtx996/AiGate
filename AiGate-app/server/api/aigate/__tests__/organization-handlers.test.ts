import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
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
}))

import orgTreeHandler from '../organization/tree.get'

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
    it('should return flat list when flat=true', async () => {
      const orgs = [
        { id: 'org-1', name: 'HQ', parentId: null, level: 'company', tokenLimit: 0, tokenUsed: 0 },
      ]
      mockSelect.mockReturnValue(createSelectChain(orgs))

      const response = await orgTreeHandler(createMockEvent({ query: { flat: 'true' } }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(orgs)
    })

    it('should return nested tree by default', async () => {
      const orgs = [
        { id: 'root', name: 'Group', parentId: null, level: 'group', tokenLimit: 0, tokenUsed: 0 },
        { id: 'child', name: 'Team', parentId: 'root', level: 'department', tokenLimit: 100, tokenUsed: 10 },
      ]
      mockSelect.mockReturnValue(createSelectChain(orgs))

      const response = await orgTreeHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(buildTree(orgs as OrgRow[]))
    })
  })
})
