import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from '../../aigate/__tests__/nitro-test-utils'
import importHandler from '../user-manage/import.post'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockCreateUser = vi.fn()
const mockAssertTenantAccountLimit = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  member: {
    userId: 'userId',
    organizationId: 'organizationId',
  },
  organization: {
    id: 'id',
    name: 'name',
    parentId: 'parentId',
  },
  role: {
    id: 'id',
    code: 'code',
    enabled: 'enabled',
  },
  userRole: {
    userId: 'userId',
    roleId: 'roleId',
  },
}))

vi.mock('#server/utils/auth', () => ({
  auth: {
    api: {
      createUser: (...args: unknown[]) => mockCreateUser(...args),
    },
  },
}))

vi.mock('#server/utils/tenant', () => ({
  assertTenantAccountLimit: (...args: unknown[]) => mockAssertTenantAccountLimit(...args),
}))

function createRoleSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createOrganizationSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockResolvedValue(result),
  }
}

function createInsertValuesChain() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  }
}

describe('system settings user import handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelect
      .mockReturnValueOnce(createRoleSelectChain([{ id: 'role-admin', code: 'admin' }]))
      .mockReturnValueOnce(
        createOrganizationSelectChain([
          { id: 'org-root', name: 'Root', parentId: null },
          { id: 'org-team', name: 'Team', parentId: 'org-root' },
        ]),
      )
    mockCreateUser.mockResolvedValue({ user: { id: 'user-1' } })
    mockInsert.mockReturnValue(createInsertValuesChain())
    mockAssertTenantAccountLimit.mockResolvedValue(undefined)
  })

  it('should reject non-admin principals', async () => {
    const response = await importHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', isAdmin: false } },
        body: { rows: [] },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('should import a user and create role and organization bindings', async () => {
    const response = await importHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        body: {
          rows: [
            {
              row: '2',
              username: 'alice',
              displayName: 'Alice',
              initialPassword: 'Password123',
              roleCode: 'admin',
              organizationPath: 'Root/Team',
            },
          ],
        },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toMatchObject({ imported: 1, failed: 0 })
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: 'alice@aigate.local',
          name: 'Alice',
          password: 'Password123',
        }),
      }),
    )
    expect(mockAssertTenantAccountLimit).toHaveBeenCalledWith('org-team')
    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it('should return row-level failure for an unknown role code', async () => {
    const response = await importHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        body: {
          rows: [
            {
              row: '2',
              username: 'bob',
              initialPassword: 'Password123',
              roleCode: 'missing',
            },
          ],
        },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toMatchObject({ imported: 0, failed: 1 })
    expect(response.data?.results[0]).toMatchObject({
      row: 2,
      username: 'bob',
      ok: false,
      reason: 'role code not found: missing',
    })
    expect(mockCreateUser).not.toHaveBeenCalled()
  })
})
