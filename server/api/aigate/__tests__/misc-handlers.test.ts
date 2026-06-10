import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { convertFlatDataToTree } from '#server/utils/index'
import { RESPONSE_CODE } from '@/enums'
import orgListHandler from '../organization/index.get'

import promptPostHandler from '../prompt/index.post'
import roleListHandler from '../role/index.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()

const insertPromptBodySchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
  organizationId: z.string().nullable().optional(),
  usageCount: z.number().optional(),
  createdBy: z.string().optional(),
  enabled: z.boolean().optional(),
})

vi.stubGlobal('convertFlatDataToTree', convertFlatDataToTree)

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  prompt: {
    id: 'id',
    name: 'name',
    content: 'content',
    organizationId: 'organizationId',
    category: 'category',
  },
  role: {
    id: 'id',
    name: 'name',
    code: 'code',
    enabled: 'enabled',
    sort: 'sort',
  },
  organization: {
    id: 'id',
    name: 'name',
    parentId: 'parentId',
    createdAt: 'createdAt',
  },
  insertPromptSchema: {
    parse: (body: unknown) => insertPromptBodySchema.parse(body),
  },
}))

interface OrgRow {
  id: string
  name: string
  parentId: string | null
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
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

function createListSelectNoWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('aigate misc handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('prompt index.post', () => {
    it('should reject invalid body missing required fields', async () => {
      const response = await promptPostHandler(
        createMockEvent({
          body: { name: 'Only name' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should create prompt with valid body', async () => {
      const created = {
        id: 'prompt-1',
        name: 'Onboarding',
        content: 'Hello {{name}}',
        category: 'general',
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await promptPostHandler(
        createMockEvent({
          body: { name: 'Onboarding', content: 'Hello {{name}}' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should inject organizationId from principal when body omits it', async () => {
      const created = {
        id: 'prompt-2',
        name: 'Org prompt',
        content: 'Scoped',
        organizationId: 'org-1',
      }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await promptPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Org prompt', content: 'Scoped' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
        }),
      )
    })

    it('should keep explicit organizationId when body provides one', async () => {
      const created = {
        id: 'prompt-3',
        name: 'Explicit org',
        content: 'Body',
        organizationId: 'org-explicit',
      }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await promptPostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-principal' } },
          body: { name: 'Explicit org', content: 'Body', organizationId: 'org-explicit' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-explicit',
        }),
      )
    })

    it('should create prompt with optional category and variables', async () => {
      const created = {
        id: 'prompt-4',
        name: 'Rich prompt',
        content: 'Hi {{user}}',
        category: 'onboarding',
        variables: ['user'],
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await promptPostHandler(
        createMockEvent({
          body: {
            name: 'Rich prompt',
            content: 'Hi {{user}}',
            category: 'onboarding',
            variables: ['user'],
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })
  })

  describe('role index.get', () => {
    it('should return all roles when no filters are provided', async () => {
      const roles = [
        { id: 'role-1', name: 'Admin', code: 'admin', enabled: true, sort: 0 },
        { id: 'role-2', name: 'Member', code: 'member', enabled: true, sort: 1 },
      ]
      mockSelect.mockReturnValue(createListSelectNoWhereChain(roles))

      const response = await roleListHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(roles)
      expect(mockSelect).toHaveBeenCalledTimes(1)
    })

    it('should filter roles by keyword', async () => {
      const roles = [{ id: 'role-1', name: 'Admin', code: 'admin', enabled: true, sort: 0 }]
      mockSelect.mockReturnValue(createListSelectChain(roles))

      const response = await roleListHandler(createMockEvent({ query: { keyword: 'admin' } }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(roles)
    })

    it('should filter roles by enabled=true', async () => {
      const roles = [{ id: 'role-1', name: 'Active', code: 'active', enabled: true, sort: 0 }]
      mockSelect.mockReturnValue(createListSelectChain(roles))

      const response = await roleListHandler(createMockEvent({ query: { enabled: 'true' } }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(roles)
    })

    it('should filter roles by enabled=false', async () => {
      const roles = [{ id: 'role-2', name: 'Disabled', code: 'disabled', enabled: false, sort: 1 }]
      mockSelect.mockReturnValue(createListSelectChain(roles))

      const response = await roleListHandler(createMockEvent({ query: { enabled: 'false' } }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(roles)
    })

    it('should combine keyword and enabled filters', async () => {
      const roles = [{ id: 'role-3', name: 'Editor', code: 'editor', enabled: true, sort: 2 }]
      mockSelect.mockReturnValue(createListSelectChain(roles))

      const response = await roleListHandler(
        createMockEvent({
          query: { keyword: 'edit', enabled: 'true' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(roles)
    })

    it('should return empty array when no roles match filters', async () => {
      mockSelect.mockReturnValue(createListSelectChain([]))

      const response = await roleListHandler(createMockEvent({ query: { keyword: 'missing' } }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual([])
    })
  })

  describe('organization index.get', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgListHandler(
        createMockEvent({
          context: { principal: { isAdmin: false } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return nested tree from flat organizations', async () => {
      const orgs: OrgRow[] = [
        { id: 'root', name: 'Group', parentId: null },
        { id: 'child', name: 'Engineering', parentId: 'root' },
      ]
      mockSelect.mockReturnValue(createListSelectNoWhereChain(orgs))

      const response = await orgListHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(convertFlatDataToTree(orgs))
    })

    it('should filter organizations by keyword', async () => {
      const orgs: OrgRow[] = [{ id: 'org-1', name: 'HQ', parentId: null }]
      mockSelect.mockReturnValue(createListSelectChain(orgs))

      const response = await orgListHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          query: { keyword: 'HQ' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(convertFlatDataToTree(orgs))
    })

    it('should return empty tree when no organizations exist', async () => {
      mockSelect.mockReturnValue(createListSelectNoWhereChain([]))

      const response = await orgListHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual([])
    })

    it('should build tree with multiple root nodes', async () => {
      const orgs: OrgRow[] = [
        { id: 'a', name: 'Company A', parentId: null },
        { id: 'b', name: 'Company B', parentId: null },
        { id: 'a1', name: 'Dept', parentId: 'a' },
      ]
      mockSelect.mockReturnValue(createListSelectNoWhereChain(orgs))

      const response = await orgListHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toHaveLength(2)
      expect(response.data).toEqual(convertFlatDataToTree(orgs))
    })
  })
})
