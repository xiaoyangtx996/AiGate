import { describe, expect, it } from 'vitest'

function resolveRole(preferredRole: string | null, roleIds: string[]) {
  return preferredRole || (roleIds.length ? roleIds[0] : 'user')
}

function resolveOrganizationId(memberships: Array<{ organizationId: string }>) {
  return memberships.length ? memberships[0].organizationId : null
}

function buildPrincipal(options: {
  userId: string
  email: string
  preferredRole?: string | null
  roleIds?: string[]
  memberships?: Array<{ organizationId: string }>
}) {
  const role = resolveRole(options.preferredRole ?? null, options.roleIds ?? [])
  const organizationId = resolveOrganizationId(options.memberships ?? [])

  return {
    userId: options.userId,
    email: options.email,
    role,
    organizationId,
    isAdmin: role === 'admin',
  }
}

describe('context utils', () => {
  describe('resolveRole', () => {
    it('should prefer session role when present', () => {
      expect(resolveRole('admin', ['user'])).toBe('admin')
      expect(resolveRole('manager', ['user'])).toBe('manager')
    })

    it('should fall back to first assigned role', () => {
      expect(resolveRole(null, ['editor', 'user'])).toBe('editor')
    })

    it('should default to user when no roles exist', () => {
      expect(resolveRole(null, [])).toBe('user')
    })
  })

  describe('resolveOrganizationId', () => {
    it('should return first membership organization id', () => {
      expect(resolveOrganizationId([{ organizationId: 'org-1' }, { organizationId: 'org-2' }]))
        .toBe('org-1')
    })

    it('should return null when user has no memberships', () => {
      expect(resolveOrganizationId([])).toBeNull()
    })
  })

  describe('buildPrincipal', () => {
    it('should mark admin principals correctly', () => {
      const principal = buildPrincipal({
        userId: 'user-1',
        email: 'admin@example.com',
        preferredRole: 'admin',
        memberships: [{ organizationId: 'org-1' }],
      })

      expect(principal).toEqual({
        userId: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
        organizationId: 'org-1',
        isAdmin: true,
      })
    })

    it('should build non-admin principal from db roles', () => {
      const principal = buildPrincipal({
        userId: 'user-2',
        email: 'member@example.com',
        roleIds: ['user'],
        memberships: [],
      })

      expect(principal.role).toBe('user')
      expect(principal.organizationId).toBeNull()
      expect(principal.isAdmin).toBe(false)
    })

    it('should prefer first db role over default user when session role is absent', () => {
      const principal = buildPrincipal({
        userId: 'user-3',
        email: 'editor@example.com',
        roleIds: ['editor', 'viewer'],
        memberships: [{ organizationId: 'org-2' }],
      })

      expect(principal.role).toBe('editor')
      expect(principal.isAdmin).toBe(false)
    })

    it('should treat empty preferred role as absent and use db roles', () => {
      expect(resolveRole('', ['manager'])).toBe('manager')
    })
  })

  describe('principal edge cases', () => {
    it('should use only first organization when multiple memberships exist', () => {
      const principal = buildPrincipal({
        userId: 'user-4',
        email: 'multi@example.com',
        roleIds: ['user'],
        memberships: [{ organizationId: 'org-primary' }, { organizationId: 'org-secondary' }],
      })

      expect(principal.organizationId).toBe('org-primary')
    })

    it('should mark editor role as non-admin', () => {
      const principal = buildPrincipal({
        userId: 'user-5',
        email: 'editor@example.com',
        preferredRole: 'editor',
      })

      expect(principal.role).toBe('editor')
      expect(principal.isAdmin).toBe(false)
    })
  })
})
