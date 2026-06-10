import { normalizeAlertRuleInput } from '~~/shared/alert-rule-templates'
import { db } from '@/db/drizzle'
import { alertRule } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const body = await readBody(event)
    const normalized = normalizeAlertRuleInput(body)
    const [res] = await db.insert(alertRule).values({
      name: normalized.name,
      type: normalized.type,
      condition: normalized.condition,
      enabled: normalized.enabled,
      notifyChannels: normalized.notifyChannels,
      organizationId: principal?.organizationId,
    }).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
