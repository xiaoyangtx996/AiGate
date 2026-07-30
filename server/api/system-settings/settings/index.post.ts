import { auditLog } from '#server/utils/audit-log'
import { listSettings, setSetting } from '#server/utils/system-settings'

const sensitiveBooleanKeys = ['advanced.gatewayDebug']
const sensitiveRetentionKeys = ['retention.apiLogDays', 'retention.operationLogDays']

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function hasSensitiveChanges(before: Record<string, unknown>, values: Record<string, unknown>) {
  for (const key of sensitiveBooleanKeys) {
    if (before[key] !== true && values[key] === true)
      return true
  }
  for (const key of sensitiveRetentionKeys) {
    if (!(key in values))
      continue
    const oldValue = toNumber(before[key])
    const newValue = toNumber(values[key])
    if (oldValue !== null && newValue !== null && newValue < oldValue)
      return true
  }
  return false
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as
      | { isAdmin?: boolean, userId?: string, organizationId?: string | null }
      | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const body = await readBody(event)
    const values = body?.values && typeof body.values === 'object' ? body.values as Record<string, unknown> : {}
    const organizationId = typeof body?.organizationId === 'string' && body.organizationId ? body.organizationId : null
    const scope = organizationId ? 'org' : 'global'
    const before = await listSettings(Object.keys(values), organizationId)
    if (hasSensitiveChanges(before, values) && body?.confirmSensitive !== true) {
      return responseError(null, 'Sensitive settings change requires confirmation', { statusCode: 400 })
    }

    const saved = []
    for (const [key, value] of Object.entries(values)) {
      saved.push(await setSetting({ key, value, scope, organizationId, updatedBy: principal.userId }))
    }

    const after = await listSettings(Object.keys(values), organizationId)
    await auditLog(event, 'system_setting.update', { type: 'system_setting', id: scope }, before, after)
    return responseSuccess({ saved: saved.length, values: after })
  }
  catch (err) {
    return responseError(err)
  }
})
