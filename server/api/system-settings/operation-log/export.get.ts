import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { logs, user } from '@/db/schema'

const csvQuotePattern = /"/g

export default defineEventHandler(async event => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.userId) conditions.push(eq(logs.userId, query.userId as string))
    if (query.method) conditions.push(eq(logs.method, query.method as any))
    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(logs)
      .leftJoin(user, eq(logs.userId, user.id))
      .where(where)
      .orderBy(desc(logs.createdAt))
      .limit(5000)

    const header = ['时间', '用户', '方法', '操作', 'IP', '设备', '系统', '浏览器']
    const csvRows = rows.map(({ logs: row, user: u }) =>
      [
        row.createdAt?.toISOString() || '',
        u?.name || u?.email || row.userId || '',
        row.method || '',
        row.action || '',
        row.ip || '',
        row.device || '',
        row.os || '',
        row.browser || '',
      ]
        .map(v => `"${String(v).replace(csvQuotePattern, '""')}"`)
        .join(','),
    )

    const csv = [header.join(','), ...csvRows].join('\n')
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setResponseHeader(event, 'Content-Disposition', 'attachment; filename="operation-logs.csv"')
    return csv
  } catch (err) {
    return responseError(err)
  }
})
