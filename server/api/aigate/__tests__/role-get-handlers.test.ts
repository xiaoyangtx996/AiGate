import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import roleGetHandler from '../role.get'

import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  role: {
    id: 'id',
    name: 'name',
    code: 'code',
    enabled: 'enabled',
    sort: 'sort',
    createdAt: 'createdAt',
  },
}))

function createRoleSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate role.get handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return only enabled roles', async () => {
    const roles = [
      { id: 'role-1', name: 'Admin', code: 'admin', enabled: true },
      { id: 'role-2', name: 'Viewer', code: 'viewer', enabled: true },
    ]
    mockSelect.mockReturnValue(createRoleSelectChain(roles))

    const response = await roleGetHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(roles)
    expect(mockSelect).toHaveBeenCalledTimes(1)
  })

  it('should filter disabled roles out', async () => {
    const roles = [
      { id: 'role-1', name: 'Admin', code: 'admin', enabled: true },
      { id: 'role-2', name: 'Legacy', code: 'legacy', enabled: false },
      { id: 'role-3', name: 'Member', code: 'member', enabled: true },
    ]
    mockSelect.mockReturnValue(createRoleSelectChain(roles))

    const response = await roleGetHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([
      { id: 'role-1', name: 'Admin', code: 'admin', enabled: true },
      { id: 'role-3', name: 'Member', code: 'member', enabled: true },
    ])
  })

  it('should return empty array when all roles are disabled', async () => {
    const roles = [{ id: 'role-1', name: 'Archived', code: 'archived', enabled: false }]
    mockSelect.mockReturnValue(createRoleSelectChain(roles))

    const response = await roleGetHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([])
  })

  it('should return responseError when db throws', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockRejectedValue(new Error('Database unavailable')),
      }),
    })

    const response = await roleGetHandler(createMockEvent())

    expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
    expect((response.data as Error).message).toBe('Database unavailable')
  })
})
