import { beforeEach, describe, expect, it, vi } from 'vitest'
import { convertFlatDataToTree } from '#server/utils/index'
import { createMockEvent } from '../../aigate/__tests__/nitro-test-utils'
import menuListHandler from '../menu-manage/index.get'

const mockSelect = vi.fn()

vi.stubGlobal('convertFlatDataToTree', convertFlatDataToTree)
vi.stubGlobal('MenuQuerySchema', {
  parse: (query: { enabled?: string, keyword?: string }) => ({
    enabled: query.enabled === undefined ? undefined : query.enabled === 'true',
    keyword: query.keyword,
  }),
})

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  menu: {
    id: 'id',
    label: 'label',
    to: 'to',
    parentId: 'parentId',
    enabled: 'enabled',
    createdAt: 'createdAt',
    sort: 'sort',
  },
  roleMenu: {
    roleId: 'roleId',
    menuId: 'menuId',
    permissions: 'permissions',
  },
  userRole: {
    userId: 'userId',
    roleId: 'roleId',
  },
}))

function createSelectOrderChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
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

const menus = [
  { id: 'root', label: 'Root', to: null, parentId: null, permissions: 0, createdAt: new Date(), sort: 0 },
  { id: 'agents', label: 'Agents', to: '/aigate/agents', parentId: 'root', permissions: 30, createdAt: new Date(), sort: 1 },
  { id: 'channels', label: 'Channels', to: '/aigate/channels', parentId: 'root', permissions: 14, createdAt: new Date(), sort: 2 },
]

describe('system settings menu-manage index.get handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all enabled menus for admin principals', async () => {
    mockSelect.mockReturnValue(createSelectOrderChain(menus))

    const response = await menuListHandler(createMockEvent({
      context: { principal: { userId: 'admin-1', isAdmin: true, roleIds: [] } },
      query: { enabled: 'true' },
    }))

    expect(response.data).toEqual(convertFlatDataToTree(menus))
  })

  it('returns only role-authorized menus and parent containers for non-admin principals', async () => {
    mockSelect
      .mockReturnValueOnce(createSelectOrderChain(menus))
      .mockReturnValueOnce(createSelectWhereChain([
        { menuId: 'agents', permissions: 2 },
        { menuId: 'agents', permissions: 4 },
      ]))

    const response = await menuListHandler(createMockEvent({
      context: { principal: { userId: 'user-1', isAdmin: false, roleIds: ['role-a', 'role-b'] } },
      query: { enabled: 'true' },
    }))

    expect(response.data).toEqual(convertFlatDataToTree([
      { ...menus[0], permissions: 0 },
      { ...menus[1], permissions: 6 },
    ]))
  })

  it('returns an empty menu tree when a non-admin principal has no roles', async () => {
    mockSelect.mockReturnValue(createSelectOrderChain(menus))

    const response = await menuListHandler(createMockEvent({
      context: { principal: { userId: 'user-1', isAdmin: false, roleIds: [] } },
      query: { enabled: 'true' },
    }))

    expect(response.data).toEqual([])
  })
})
