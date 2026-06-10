import { z } from 'zod'
import { createOrganizationQuotaRequest } from '#server/utils/quota'

const quotaRequestBodySchema = z.object({
  organizationId: z.string().optional(),
  requestedTokenLimit: z.number().int().nonnegative(),
  reason: z.string().optional(),
})

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { organizationId?: string | null; userId?: string } | undefined
    if (!principal?.userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const body = quotaRequestBodySchema.parse(await readBody(event))
    const organizationId = body.organizationId ?? principal.organizationId
    if (!organizationId) {
      throw createError({ statusCode: 400, statusMessage: '缺少组织' })
    }
    if (principal.organizationId && organizationId !== principal.organizationId) {
      throw createError({ statusCode: 403, statusMessage: '无权申请其他组织配额' })
    }

    const draft = {
      organizationId,
      requestedTokenLimit: body.requestedTokenLimit,
      requesterId: principal.userId,
    }
    const created = await createOrganizationQuotaRequest(body.reason ? { ...draft, reason: body.reason } : draft)

    return responseSuccess(created)
  } catch (err) {
    return responseError(err)
  }
})
