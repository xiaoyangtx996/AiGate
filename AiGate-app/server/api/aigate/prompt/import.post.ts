import { db } from '@/db/drizzle'
import { prompt } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null, userId?: string } | undefined
    const body = await readBody(event)
    const items = Array.isArray(body) ? body : body.items
    if (!Array.isArray(items)) { return responseSuccess(null, '无效的导入数据', 400) }

    let imported = 0
    for (const item of items) {
      if (!item.name || !item.content) continue
      await db.insert(prompt).values({
        name: item.name,
        description: item.description || '',
        content: item.content,
        category: item.category || 'general',
        variables: item.variables || [],
        organizationId: principal?.organizationId,
        createdBy: principal?.userId,
      })
      imported++
    }
    return responseSuccess({ imported, total: items.length })
  }
  catch (err) { return responseError(err) }
})
