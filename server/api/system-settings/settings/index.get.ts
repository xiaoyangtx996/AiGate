import { getSettingsMeta, listSettings } from '#server/utils/system-settings'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin)
      return responseError(null, 'Forbidden', { statusCode: 403 })

    const query = getQuery(event)
    const organizationId = typeof query.organizationId === 'string' ? query.organizationId : null
    const values = await listSettings(undefined, organizationId)
    const meta = await getSettingsMeta(organizationId)
    return responseSuccess({ values, meta })
  }
  catch (err) {
    return responseError(err)
  }
})
