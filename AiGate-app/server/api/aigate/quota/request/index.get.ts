import { and, desc, eq, sql } from 'drizzle-orm'
import { canReviewQuotaRequests } from '#server/utils/quota-authorization'
import { db } from '@/db/drizzle'
import { organization, quotaRequest, user } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null, userId?: string, role?: string | null, isAdmin?: boolean } | undefined
    const query = getQuery(event)
    const conditions = []

    if (principal?.organizationId) {
      conditions.push(eq(quotaRequest.organizationId, principal.organizationId))
    }
    if (query.status) {
      conditions.push(eq(quotaRequest.status, query.status as 'pending' | 'approved' | 'rejected'))
    }
    if (query.mine === 'true' && principal?.userId) {
      conditions.push(eq(quotaRequest.requesterId, principal.userId))
    }
    else if (!canReviewQuotaRequests(principal) && principal?.userId) {
      conditions.push(eq(quotaRequest.requesterId, principal.userId))
    }

    const data = await db
      .select({
        id: quotaRequest.id,
        organizationId: quotaRequest.organizationId,
        organizationName: organization.name,
        requesterId: quotaRequest.requesterId,
        requesterName: user.name,
        requesterEmail: user.email,
        requestedTokenLimit: quotaRequest.requestedTokenLimit,
        currentTokenLimit: quotaRequest.currentTokenLimit,
        reason: quotaRequest.reason,
        status: quotaRequest.status,
        approverId: quotaRequest.approverId,
        decisionComment: quotaRequest.decisionComment,
        decidedAt: quotaRequest.decidedAt,
        canDecide: sql<boolean>`false`,
        createdAt: quotaRequest.createdAt,
        updatedAt: quotaRequest.updatedAt,
      })
      .from(quotaRequest)
      .leftJoin(organization, eq(quotaRequest.organizationId, organization.id))
      .leftJoin(user, eq(quotaRequest.requesterId, user.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(quotaRequest.createdAt))

    const canDecide = canReviewQuotaRequests(principal)
    return responseSuccess(data.map(item => ({
      ...item,
      canDecide: canDecide && item.requesterId !== principal?.userId,
    })))
  }
  catch (err) { return responseError(err) }
})
