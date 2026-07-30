import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getRequestPrincipal, requireAdmin, requireRequestPrincipal } from '#server/utils/context'

const mockGetSession = vi.fn()
const mockSelect = vi.fn()

vi.mock('#server/utils/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  userRole: { userId: 'userId', roleId: 'roleId' },
  role: { id: 'id', code: 'code' },
  member: { userId: 'userId', organizationId: 'organizationId' },
  organization: { id: 'id' },
}))

vi.stubGlobal('getCookie', (event: { _cookies?: Record<string, string> }, name: string) => event._cookies?.[name])

function createRoleSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
      }),
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createMockEvent(
  options: {
    headers?: Headers
    context?: Record<string, unknown>
    cookies?: Record<string, string>
  } = {},
) {
  return {
    headers: options.headers ?? new Headers(),
    context: options.context ?? {},
    _cookies: options.cookies ?? {},
  }
}

describe('context integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRequestPrincipal', () => {
    it('should throw 401 when session is missing', async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(getRequestPrincipal(createMockEvent() as never)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
      })
    })

    it('should build admin principal with global view when active org cookie is missing', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', email: 'a@example.com', role: 'admin' },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([{ roleId: 'role-editor', code: 'editor' }]))
        .mockReturnValueOnce(createRoleSelectChain([{ organizationId: 'org-1' }]))

      const principal = await getRequestPrincipal(createMockEvent() as never)

      expect(principal).toMatchObject({
        userId: 'user-1',
        email: 'a@example.com',
        role: 'admin',
        roleIds: ['role-editor'],
        roleCodes: ['editor'],
        memberships: ['org-1'],
        organizationId: null,
        isAdmin: true,
      })
    })

    it('should allow admin active organization cookie when the organization exists', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([]))
        .mockReturnValueOnce(createRoleSelectChain([{ organizationId: 'org-1' }]))
        .mockReturnValueOnce(createRoleSelectChain([{ id: 'org-2' }]))

      const principal = await getRequestPrincipal(createMockEvent({ cookies: { aigate_active_org: 'org-2' } }) as never)

      expect(principal).toMatchObject({
        userId: 'admin-1',
        role: 'admin',
        organizationId: 'org-2',
        isAdmin: true,
      })
    })

    it('should use non-admin active organization cookie only when it is in memberships', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-3', email: 'c@example.com', role: null },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([]))
        .mockReturnValueOnce(createRoleSelectChain([{ organizationId: 'org-1' }, { organizationId: 'org-2' }]))

      const principal = await getRequestPrincipal(createMockEvent({ cookies: { aigate_active_org: 'org-2' } }) as never)

      expect(principal).toMatchObject({
        userId: 'user-3',
        memberships: ['org-1', 'org-2'],
        organizationId: 'org-2',
        isAdmin: false,
      })
    })

    it('should ignore non-admin active organization cookie outside memberships', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-4', email: 'd@example.com', role: null },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([]))
        .mockReturnValueOnce(createRoleSelectChain([{ organizationId: 'org-1' }, { organizationId: 'org-2' }]))

      const principal = await getRequestPrincipal(createMockEvent({ cookies: { aigate_active_org: 'org-other' } }) as never)

      expect(principal).toMatchObject({
        userId: 'user-4',
        memberships: ['org-1', 'org-2'],
        organizationId: 'org-1',
        isAdmin: false,
      })
    })

    it('should fall back to first role and default user role', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-2', email: 'b@example.com', role: null },
      })
      mockSelect.mockReturnValueOnce(createRoleSelectChain([])).mockReturnValueOnce(createRoleSelectChain([]))

      const principal = await getRequestPrincipal(createMockEvent() as never)

      expect(principal.role).toBe('user')
      expect(principal.roleIds).toEqual([])
      expect(principal.organizationId).toBeNull()
      expect(principal.isAdmin).toBe(false)
    })

    it('should treat db super_admin role as admin without session admin role', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'super-1', email: 'super@example.com', role: null },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([{ roleId: 'role-super', code: 'super_admin' }]))
        .mockReturnValueOnce(createRoleSelectChain([{ organizationId: 'org-1' }]))

      const principal = await getRequestPrincipal(createMockEvent() as never)

      expect(principal).toMatchObject({
        userId: 'super-1',
        role: 'super_admin',
        roleIds: ['role-super'],
        roleCodes: ['super_admin'],
        organizationId: null,
        isAdmin: true,
      })
    })
  })

  describe('requireRequestPrincipal', () => {
    it('should return cached principal from event context', async () => {
      const cached = { userId: 'cached', email: 'c@example.com', role: 'admin', organizationId: null, isAdmin: true }
      const principal = await requireRequestPrincipal(createMockEvent({ context: { principal: cached } }) as never)

      expect(principal).toBe(cached)
      expect(mockGetSession).not.toHaveBeenCalled()
    })
  })

  describe('requireAdmin', () => {
    it('should throw 403 for non-admin principals', async () => {
      const event = createMockEvent({
        context: { principal: { userId: 'u1', email: 'u@x.com', role: 'user', organizationId: null, isAdmin: false } },
      })

      await expect(requireAdmin(event as never)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Forbidden',
      })
    })

    it('should return admin principal', async () => {
      const admin = { userId: 'admin-1', email: 'a@x.com', role: 'admin', organizationId: 'org-1', isAdmin: true }
      const principal = await requireAdmin(createMockEvent({ context: { principal: admin } }) as never)

      expect(principal).toEqual(admin)
    })
  })
})
