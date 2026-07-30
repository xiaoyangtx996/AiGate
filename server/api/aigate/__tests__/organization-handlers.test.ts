import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { RESPONSE_CODE } from '@/enums'
import orgDeleteHandler from '../organization/[id].delete'
import orgPutHandler from '../organization/[id].put'

import orgPostHandler from '../organization/index.post'
import orgTreeHandler from '../organization/tree.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockTransaction = vi.fn()
const mockAuditLog = vi.fn()
const mockClearTenantContextCache = vi.fn()
const mockDeleteOrganizationReturningQuota = vi.fn()
const mockMoveOrganizationParentQuota = vi.fn()

const insertOrgBodySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  level: z.enum(['group', 'company', 'department', 'team']).optional(),
  tokenLimit: z.number().optional(),
  packageId: z.string().nullable().optional(),
  expireTime: z.any().nullable().optional(),
  accountLimit: z.number().optional(),
  tenantStatus: z.enum(['active', 'suspended']).optional(),
})

const updateOrgBodySchema = z.object({
  name: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  level: z.enum(['group', 'company', 'department', 'team']).optional(),
  tokenLimit: z.number().optional(),
  tokenUsed: z.number().optional(),
  enabled: z.boolean().optional(),
  packageId: z.string().nullable().optional(),
  expireTime: z.any().nullable().optional(),
  accountLimit: z.number().optional(),
  tenantStatus: z.enum(['active', 'suspended']).optional(),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    transaction: (...args: unknown[]) => mockTransaction(...args),
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

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

vi.mock('#server/utils/quota', () => ({
  deleteOrganizationReturningQuota: (...args: unknown[]) => mockDeleteOrganizationReturningQuota(...args),
  moveOrganizationParentQuota: (...args: unknown[]) => mockMoveOrganizationParentQuota(...args),
}))

vi.mock('#server/utils/tenant', () => ({
  clearTenantContextCache: (...args: unknown[]) => mockClearTenantContextCache(...args),
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

function createSelectWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
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
    mockAuditLog.mockResolvedValue(undefined)
    mockDeleteOrganizationReturningQuota.mockResolvedValue({
      id: 'org-deleted',
      name: 'Deleted Org',
      parentId: 'org-parent',
      tokenLimit: 1000,
      tokenUsed: 0,
    })
    mockMoveOrganizationParentQuota.mockResolvedValue(undefined)
    mockTransaction.mockImplementation(async (callback: any) => callback({
      update: mockUpdate,
      select: mockSelect,
      delete: mockDelete,
    }))
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
      const response = await orgTreeHandler(
        createMockEvent({
          context: { principal: { isAdmin: false } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should return flat list when flat=true', async () => {
      const orgs = [{ id: 'org-1', name: 'HQ', parentId: null, level: 'company', tokenLimit: 0, tokenUsed: 0 }]
      mockSelect.mockReturnValue(createSelectChain(orgs))

      const response = await orgTreeHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          query: { flat: 'true' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(orgs)
    })

    it('should return nested tree by default', async () => {
      const orgs = [
        { id: 'root', name: 'Group', parentId: null, level: 'group', tokenLimit: 0, tokenUsed: 0 },
        { id: 'child', name: 'Team', parentId: 'root', level: 'department', tokenLimit: 100, tokenUsed: 10 },
      ]
      mockSelect.mockReturnValue(createSelectChain(orgs))

      const response = await orgTreeHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(buildTree(orgs as OrgRow[]))
    })

    it('should return empty list when no organizations exist', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await orgTreeHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          query: { flat: 'true' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual([])
    })
  })

  describe('organization index.post', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: false } },
          body: { name: 'HQ' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should reject invalid body missing name', async () => {
      const response = await orgPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { level: 'company' },
        }),
      )

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

      const response = await orgPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { name: 'HQ', level: 'company', tokenLimit: 1000 },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should write audit log after creating organization', async () => {
      const created = {
        id: 'org-audit',
        name: 'Audit Org',
        parentId: null,
        level: 'company',
        tokenLimit: 1000,
        tokenUsed: 0,
      }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        body: { name: 'Audit Org', level: 'company', tokenLimit: 1000 },
      })
      const response = await orgPostHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'organization.create',
        { type: 'organization', id: 'org-audit' },
        null,
        created,
      )
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

      const response = await orgPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: { name: 'Engineering', parentId: 'org-root', level: 'department', tokenLimit: 500 },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
    })

    it('should ignore tenant package fields when creating child organization', async () => {
      const insert = createInsertChain([{ id: 'org-child', name: 'Engineering', parentId: 'org-root' }])
      mockInsert.mockReturnValue(insert)

      const response = await orgPostHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          body: {
            name: 'Engineering',
            parentId: 'org-root',
            packageId: 'pkg-pro',
            expireTime: new Date('2026-12-31T00:00:00Z'),
            accountLimit: 10,
            tenantStatus: 'suspended',
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(insert.values).toHaveBeenCalledWith(expect.objectContaining({
        packageId: null,
        expireTime: null,
        accountLimit: -1,
        tenantStatus: 'active',
      }))
    })
  })

  describe('organization [id].put', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: false } },
          params: { id: 'org-1' },
          body: { name: 'Forbidden' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should reject invalid body with bad level', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([{ id: 'org-1', parentId: null }]))

      const response = await orgPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'org-1' },
          body: { level: 'invalid-level' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should update organization fields by id', async () => {
      const before = {
        id: 'org-1',
        name: 'HQ',
        parentId: null,
        level: 'company',
        tokenLimit: 1000,
        tokenUsed: 100,
      }
      const updated = {
        id: 'org-1',
        name: 'Renamed HQ',
        parentId: null,
        level: 'company',
        tokenLimit: 2000,
        tokenUsed: 100,
      }
      mockSelect.mockReturnValue(createSelectWhereChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await orgPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'org-1' },
          body: { name: 'Renamed HQ', tokenLimit: 2000 },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockMoveOrganizationParentQuota).toHaveBeenCalledWith(
        expect.objectContaining({ update: mockUpdate }),
        before,
        undefined,
      )
      expect(mockClearTenantContextCache).toHaveBeenCalledWith()
    })

    it('should clear tenant fields when updating a child organization', async () => {
      const before = {
        id: 'org-child',
        name: 'Engineering',
        parentId: 'org-root',
        level: 'department',
      }
      const updated = {
        ...before,
        packageId: null,
        expireTime: null,
        accountLimit: -1,
        tenantStatus: 'active',
      }
      const update = createUpdateChain([updated])
      mockSelect.mockReturnValue(createSelectWhereChain([before]))
      mockUpdate.mockReturnValue(update)

      const response = await orgPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'org-child' },
          body: { packageId: 'pkg-pro', accountLimit: 10, tenantStatus: 'suspended' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(update.set).toHaveBeenCalledWith(expect.objectContaining({
        packageId: null,
        expireTime: null,
        accountLimit: -1,
        tenantStatus: 'active',
      }))
      expect(mockClearTenantContextCache).toHaveBeenCalledWith()
    })

    it('should adjust parent quota when moving organization to another parent', async () => {
      const before = {
        id: 'org-child',
        name: 'Engineering',
        parentId: 'old-parent',
        level: 'department',
        tokenLimit: 1000,
        tokenUsed: 0,
      }
      const updated = { ...before, parentId: 'new-parent' }
      mockSelect.mockReturnValue(createSelectWhereChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await orgPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'org-child' },
          body: { parentId: 'new-parent' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockMoveOrganizationParentQuota).toHaveBeenCalledWith(
        expect.objectContaining({ update: mockUpdate }),
        before,
        'new-parent',
      )
    })

    it('should write audit log with before and after when updating organization', async () => {
      const before = {
        id: 'org-audit',
        name: 'Before Org',
        parentId: null,
        level: 'company',
        tokenLimit: 1000,
        tokenUsed: 100,
      }
      const updated = {
        id: 'org-audit',
        name: 'After Org',
        parentId: null,
        level: 'company',
        tokenLimit: 2000,
        tokenUsed: 100,
      }
      mockSelect.mockReturnValue(createSelectWhereChain([before]))
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'org-audit' },
        body: { name: 'After Org', tokenLimit: 2000 },
      })
      const response = await orgPutHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'organization.update',
        { type: 'organization', id: 'org-audit' },
        before,
        updated,
      )
    })

    it('should return 404 when organization id is not found', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([]))

      const response = await orgPutHandler(
        createMockEvent({
          context: { principal: { isAdmin: true } },
          params: { id: 'missing' },
          body: { name: 'Ghost Org' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('Organization not found')
    })
  })

  describe('organization [id].delete', () => {
    it('should reject non-admin principals', async () => {
      const response = await orgDeleteHandler(
        createMockEvent({
          context: { principal: { isAdmin: false } },
          params: { id: 'org-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockDeleteOrganizationReturningQuota).not.toHaveBeenCalled()
    })

    it('should delete organization through quota helper and write audit log', async () => {
      const deleted = {
        id: 'org-child',
        name: 'Engineering',
        parentId: 'org-root',
        tokenLimit: 1000,
        tokenUsed: 0,
      }
      mockDeleteOrganizationReturningQuota.mockResolvedValue(deleted)
      const event = createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'org-child' },
      })

      const response = await orgDeleteHandler(event)

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
      expect(mockDeleteOrganizationReturningQuota).toHaveBeenCalledWith('org-child')
      expect(mockClearTenantContextCache).toHaveBeenCalledWith()
      expect(mockAuditLog).toHaveBeenCalledWith(
        event,
        'organization.delete',
        { type: 'organization', id: 'org-child' },
        deleted,
        null,
      )
    })
  })
})
