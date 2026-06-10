import { describe, expect, it } from 'vitest'
import { canApproveQuotaRequest, canReviewQuotaRequests } from '../quota-authorization'

describe('quota authorization', () => {
  it('should allow admins to review and approve any request', () => {
    const principal = { userId: 'admin-1', isAdmin: true, role: 'admin' }

    expect(canReviewQuotaRequests(principal)).toBe(true)
    expect(canApproveQuotaRequest(principal, { organizationId: 'org-2', requesterId: 'user-1' })).toBe(true)
  })

  it('should allow organization managers to approve requests in their organization', () => {
    const principal = { userId: 'manager-1', organizationId: 'org-1', role: 'manager', isAdmin: false }

    expect(canReviewQuotaRequests(principal)).toBe(true)
    expect(canApproveQuotaRequest(principal, { organizationId: 'org-1', requesterId: 'user-1' })).toBe(true)
  })

  it('should reject managers outside their organization and self approvals', () => {
    const principal = { userId: 'manager-1', organizationId: 'org-1', role: 'manager', isAdmin: false }

    expect(canApproveQuotaRequest(principal, { organizationId: 'org-2', requesterId: 'user-1' })).toBe(false)
    expect(canApproveQuotaRequest(principal, { organizationId: 'org-1', requesterId: 'manager-1' })).toBe(false)
  })

  it('should reject ordinary users', () => {
    const principal = { userId: 'user-1', organizationId: 'org-1', role: 'user', isAdmin: false }

    expect(canReviewQuotaRequests(principal)).toBe(false)
    expect(canApproveQuotaRequest(principal, { organizationId: 'org-1', requesterId: 'user-2' })).toBe(false)
  })
})
