import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import activeOrganizationHandler from '../active-organization.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockSetCookie = vi.fn()
const mockDeleteCookie = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: { id: 'id' },
}))

vi.stubGlobal('setCookie', (...args: unknown[]) => mockSetCookie(...args))
vi.stubGlobal('deleteCookie', (...args: unknown[]) => mockDeleteCookie(...args))

function createSelectWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('active organization handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should set active organization for non-admin membership', async () => {
    const event = createMockEvent({
      context: { principal: { isAdmin: false, memberships: ['org-1'] } },
      body: { organizationId: 'org-1' },
    })

    const response = await activeOrganizationHandler(event)

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({ organizationId: 'org-1' })
    expect(mockSetCookie).toHaveBeenCalledWith(event, 'aigate_active_org', 'org-1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })
    expect(mockSelect).not.toHaveBeenCalled()
  })

  it('should reject non-admin organization outside memberships', async () => {
    const response = await activeOrganizationHandler(
      createMockEvent({
        context: { principal: { isAdmin: false, memberships: ['org-1'] } },
        body: { organizationId: 'org-2' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('should clear active organization for admin global view', async () => {
    const event = createMockEvent({
      context: { principal: { isAdmin: true, memberships: [] } },
      body: { organizationId: null },
    })

    const response = await activeOrganizationHandler(event)

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({ organizationId: null })
    expect(mockDeleteCookie).toHaveBeenCalledWith(event, 'aigate_active_org', { path: '/' })
    expect(mockSetCookie).not.toHaveBeenCalled()
  })

  it('should reject admin switch to a missing organization', async () => {
    mockSelect.mockReturnValue(createSelectWhereChain([]))

    const response = await activeOrganizationHandler(
      createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { organizationId: 'missing' },
      }),
    )

    expect(response.code).toBe(404)
    expect(mockSetCookie).not.toHaveBeenCalled()
  })
})
