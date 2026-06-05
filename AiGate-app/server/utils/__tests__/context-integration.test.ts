import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  member: { userId: 'userId', organizationId: 'organizationId' },
}))

import { getRequestPrincipal, requireAdmin, requireRequestPrincipal } from '#server/utils/context'

function createRoleSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createMockEvent(options: {
  headers?: Headers
  context?: Record<string, unknown>
} = {}) {
  return {
    headers: options.headers ?? new Headers(),
    context: options.context ?? {},
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

    it('should build principal with preferred role and organization', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-1', email: 'a@example.com', role: 'admin' },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([{ roleId: 'editor' }]))
        .mockReturnValueOnce(createRoleSelectChain([{ organizationId: 'org-1' }]))

      const principal = await getRequestPrincipal(createMockEvent() as never)

      expect(principal).toMatchObject({
        userId: 'user-1',
        email: 'a@example.com',
        role: 'admin',
        organizationId: 'org-1',
        isAdmin: true,
      })
    })

    it('should fall back to first role and default user role', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-2', email: 'b@example.com', role: null },
      })
      mockSelect
        .mockReturnValueOnce(createRoleSelectChain([]))
        .mockReturnValueOnce(createRoleSelectChain([]))

      const principal = await getRequestPrincipal(createMockEvent() as never)

      expect(principal.role).toBe('user')
      expect(principal.organizationId).toBeNull()
      expect(principal.isAdmin).toBe(false)
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
