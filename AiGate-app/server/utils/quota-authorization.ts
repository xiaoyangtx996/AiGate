const QUOTA_APPROVER_ROLES = new Set([
  'admin',
  'owner',
  'manager',
  'group_admin',
  'company_admin',
  'department_admin',
  'team_admin',
])

export interface QuotaPrincipal {
  userId?: string
  organizationId?: string | null
  role?: string | null
  isAdmin?: boolean
}

export interface QuotaRequestScope {
  organizationId: string
  requesterId?: string | null
}

export function canReviewQuotaRequests(principal: QuotaPrincipal | undefined) {
  if (!principal?.userId)
    return false

  if (principal.isAdmin)
    return true

  return QUOTA_APPROVER_ROLES.has(principal.role ?? '')
}

export function canApproveQuotaRequest(
  principal: QuotaPrincipal | undefined,
  request: QuotaRequestScope,
) {
  if (!principal?.userId)
    return false

  if (principal.isAdmin)
    return true

  if (!QUOTA_APPROVER_ROLES.has(principal.role ?? ''))
    return false

  if (!principal.organizationId || principal.organizationId !== request.organizationId)
    return false

  return request.requesterId !== principal.userId
}
