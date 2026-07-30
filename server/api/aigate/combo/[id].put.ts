import { and, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel, modelCombo, modelComboItem } from '@/db/schema'

interface ComboItemInput {
  channelId?: string
  modelName?: string
}

function normalizeItems(items: unknown) {
  if (items === undefined)
    return undefined
  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Combo 至少需要一个回退项' })
  }
  return (items as ComboItemInput[]).map((item, index) => {
    if (!item.channelId || !item.modelName) {
      throw createError({ statusCode: 400, statusMessage: 'Combo item 缺少 channelId 或 modelName' })
    }
    return { channelId: item.channelId, modelName: item.modelName, sort: index }
  })
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const body = await readBody(event)
    const scope = principal.organizationId ? eq(modelCombo.organizationId, principal.organizationId) : isNull(modelCombo.organizationId)
    const [target] = await db
      .select()
      .from(modelCombo)
      .where(and(eq(modelCombo.id, id!), scope))
      .limit(1)
    if (!target) {
      return responseError(null, 'Combo 不存在或无权操作', { statusCode: 404 })
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : target.name
    if (!name) {
      return responseError(null, 'Combo 名称不能为空', { statusCode: 400 })
    }

    const [existing] = await db
      .select({ id: modelCombo.id })
      .from(modelCombo)
      .where(and(eq(modelCombo.name, name), ne(modelCombo.id, id!), scope))
      .limit(1)
    if (existing) {
      return responseError(null, 'Combo 名称已存在', { statusCode: 409 })
    }

    const items = normalizeItems(body?.items)
    if (items) {
      const channelIds = [...new Set(items.map(item => item.channelId))]
      const channels = await db.select({ id: channel.id }).from(channel).where(inArray(channel.id, channelIds))
      if (channels.length !== channelIds.length) {
        return responseError(null, 'Combo item 包含不存在的渠道', { statusCode: 400 })
      }
    }

    const result = await db.transaction(async (tx) => {
      const [combo] = await tx
        .update(modelCombo)
        .set({
          name,
          description: typeof body?.description === 'string' ? body.description : target.description,
          enabled: typeof body?.enabled === 'boolean' ? body.enabled : target.enabled,
          updatedAt: new Date(),
        })
        .where(eq(modelCombo.id, id!))
        .returning()
      if (!combo)
        throw createError({ statusCode: 404, statusMessage: 'Combo 不存在或无权操作' })

      if (items) {
        await tx.delete(modelComboItem).where(eq(modelComboItem.comboId, combo.id))
        const comboItems = await tx
          .insert(modelComboItem)
          .values(items.map(item => ({ ...item, comboId: combo.id })))
          .returning()
        return { ...combo, items: comboItems }
      }

      const comboItems = await tx
        .select()
        .from(modelComboItem)
        .where(eq(modelComboItem.comboId, combo.id))
      return { ...combo, items: comboItems }
    })

    return responseSuccess(result)
  }
  catch (err) {
    return responseError(err)
  }
})
