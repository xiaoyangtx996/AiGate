import { and, eq } from 'drizzle-orm'
import { normalizeAlertRuleUpdateInput } from '~~/shared/alert-rule-templates'
import { db } from '@/db/drizzle'
import { alertRule } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const normalized = normalizeAlertRuleUpdateInput(body)
    const where = principal?.organizationId
      ? and(eq(alertRule.id, id!), eq(alertRule.organizationId, principal.organizationId))
      : eq(alertRule.id, id!)
    const [res] = await db.update(alertRule).set(normalized).where(where).returning()
    if (!res) {
      return responseError(null, '规则不存在', { statusCode: 404 })
    }
    return responseSuccess(res)
  } catch (err) {
    return responseError(err)
  }
})
