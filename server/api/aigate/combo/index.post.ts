import { and, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { channel, modelCombo, modelComboItem } from '@/db/schema'

interface ComboItemInput {
  channelId?: string
  modelName?: string
}

function normalizeItems(items: unknown): Array<{ channelId: string, modelName: string, sort: number }> {
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

    const body = await readBody(event)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return responseError(null, 'Combo 名称不能为空', { statusCode: 400 })
    }

    const items = normalizeItems(body?.items)
    const [existing] = await db
      .select({ id: modelCombo.id })
      .from(modelCombo)
      .where(
        and(
          eq(modelCombo.name, name),
          principal.organizationId ? eq(modelCombo.organizationId, principal.organizationId) : isNull(modelCombo.organizationId),
        ),
      )
      .limit(1)
    if (existing) {
      return responseError(null, 'Combo 名称已存在', { statusCode: 409 })
    }

    const channels = await db
      .select({ id: channel.id })
      .from(channel)
      .where(inArray(channel.id, [...new Set(items.map(item => item.channelId))]))
    if (channels.length !== new Set(items.map(item => item.channelId)).size) {
      return responseError(null, 'Combo item 包含不存在的渠道', { statusCode: 400 })
    }

    const result = await db.transaction(async (tx) => {
      const [combo] = await tx
        .insert(modelCombo)
        .values({
          organizationId: principal.organizationId ?? null,
          name,
          description: typeof body?.description === 'string' ? body.description : null,
          enabled: body?.enabled !== false,
        })
        .returning()
      if (!combo)
        throw createError({ statusCode: 500, statusMessage: 'Combo 创建失败' })

      const comboItems = await tx
        .insert(modelComboItem)
        .values(items.map(item => ({ ...item, comboId: combo.id })))
        .returning()

      return { ...combo, items: comboItems }
    })

    return responseSuccess(result)
  }
  catch (err) {
    return responseError(err)
  }
})
