import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertTenantAccountLimit, clearTenantContextCache, getTenantBlockReason } from '../tenant'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: {
    id: 'id',
    parentId: 'parentId',
  },
  tenantPackage: {
    id: 'id',
  },
  member: {
    userId: 'userId',
    organizationId: 'organizationId',
  },
}))

function createWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createFromChain(result: unknown[]) {
  return {
    from: vi.fn().mockResolvedValue(result),
  }
}

describe('tenant utils', () => {
  const tenant = {
    id: 'tenant-1',
    parentId: null,
    packageId: null,
    accountLimit: 2,
    tenantStatus: 'active',
    expireTime: null,
  }
  const orgTree = [
    { id: 'tenant-1', parentId: null },
    { id: 'dept-1', parentId: 'tenant-1' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    clearTenantContextCache()
  })

  it('should return suspended and expired tenant block reasons', () => {
    expect(getTenantBlockReason({ tenant: { ...tenant, tenantStatus: 'suspended' } as never, package: null })).toEqual({
      code: 'TENANT_SUSPENDED',
      message: 'Tenant is suspended',
    })
    expect(getTenantBlockReason({ tenant: { ...tenant, expireTime: new Date(Date.now() - 1000) } as never, package: null })).toEqual({
      code: 'TENANT_EXPIRED',
      message: 'Tenant has expired',
    })
  })

  it('should reject a new user when distinct tenant members reach the account limit', async () => {
    mockSelect
      .mockReturnValueOnce(createWhereChain([tenant]))
      .mockReturnValueOnce(createFromChain(orgTree))
      .mockReturnValueOnce(createWhereChain([{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-1' }]))
      .mockReturnValueOnce(createFromChain(orgTree))
      .mockReturnValueOnce(createWhereChain([{ userId: 'user-1' }, { userId: 'user-2' }]))

    await expect(assertTenantAccountLimit('dept-1', 'user-3')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Tenant account limit reached',
    })
  })

  it('should allow an existing user to be added inside the same tenant subtree at the limit', async () => {
    mockSelect
      .mockReturnValueOnce(createWhereChain([tenant]))
      .mockReturnValueOnce(createFromChain(orgTree))
      .mockReturnValueOnce(createWhereChain([{ userId: 'user-1' }, { userId: 'user-2' }]))
      .mockReturnValueOnce(createFromChain(orgTree))
      .mockReturnValueOnce(createWhereChain([{ userId: 'user-1' }, { userId: 'user-2' }]))

    await expect(assertTenantAccountLimit('dept-1', 'user-2')).resolves.toBeUndefined()
  })
})
