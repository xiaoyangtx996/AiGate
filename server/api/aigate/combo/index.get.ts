import { asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { modelCombo, modelComboItem } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const combos = await db
      .select()
      .from(modelCombo)
      .where(principal.organizationId ? eq(modelCombo.organizationId, principal.organizationId) : isNull(modelCombo.organizationId))
      .orderBy(asc(modelCombo.name))

    const comboIds = combos.map(item => item.id)
    const items = comboIds.length
      ? await db
          .select()
          .from(modelComboItem)
          .where(inArray(modelComboItem.comboId, comboIds))
          .orderBy(asc(modelComboItem.sort), asc(modelComboItem.createdAt))
      : []

    return responseSuccess(
      combos.map(combo => ({
        ...combo,
        items: items.filter(item => item.comboId === combo.id),
      })),
    )
  }
  catch (err) {
    return responseError(err)
  }
})
