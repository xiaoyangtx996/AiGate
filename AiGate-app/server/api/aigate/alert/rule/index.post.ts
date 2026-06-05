import { db } from '@/db/drizzle'
import { alertRule } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const body = await readBody(event)
    const [res] = await db.insert(alertRule).values({
      name: body.name,
      type: body.type,
      condition: body.condition || {},
      enabled: body.enabled ?? true,
      notifyChannels: body.notifyChannels || [],
      organizationId: principal?.organizationId,
    }).returning()
    return responseSuccess(res)
  }
  catch (err) { return responseError(err) }
})
