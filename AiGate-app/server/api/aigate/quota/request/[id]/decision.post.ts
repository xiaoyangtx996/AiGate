import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { decideOrganizationQuotaRequest } from '#server/utils/quota'
import { canApproveQuotaRequest } from '#server/utils/quota-authorization'
import { db } from '@/db/drizzle'
import { quotaRequest } from '@/db/schema'

const quotaDecisionBodySchema = z.object({
  status: z.enum(['approved', 'rejected']),
  comment: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { userId?: string, organizationId?: string | null, role?: string | null, isAdmin?: boolean } | undefined
    if (!principal?.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const requestId = getRouterParam(event, 'id')
    const [request] = await db
      .select({
        organizationId: quotaRequest.organizationId,
        requesterId: quotaRequest.requesterId,
      })
      .from(quotaRequest)
      .where(eq(quotaRequest.id, requestId ?? ''))

    if (!request) {
      throw createError({ statusCode: 404, statusMessage: '配额申请不存在' })
    }

    if (!canApproveQuotaRequest(principal, request)) {
      throw createError({ statusCode: 403, statusMessage: '无权审批该配额申请' })
    }

    const body = quotaDecisionBodySchema.parse(await readBody(event))
    const decision = {
      requestId: requestId ?? '',
      status: body.status,
      approverId: principal.userId,
    }
    const updated = await decideOrganizationQuotaRequest(
      body.comment ? { ...decision, comment: body.comment } : decision,
    )

    return responseSuccess(updated)
  }
  catch (err) { return responseError(err) }
})
