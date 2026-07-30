import { and, desc, eq, gte, ilike, lte } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { logs, user } from '@/db/schema'

const csvQuotePattern = /"/g

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const conditions = []
    if (query.userId)
      conditions.push(eq(logs.userId, query.userId as string))
    if (query.method)
      conditions.push(eq(logs.method, query.method as any))
    if (query.action)
      conditions.push(ilike(logs.action, `%${query.action}%`))
    if (query.targetType)
      conditions.push(eq(logs.targetType, query.targetType as string))
    if (query.startTime)
      conditions.push(gte(logs.createdAt, new Date(Number(query.startTime))))
    if (query.endTime)
      conditions.push(lte(logs.createdAt, new Date(Number(query.endTime))))
    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(logs)
      .leftJoin(user, eq(logs.userId, user.id))
      .where(where)
      .orderBy(desc(logs.createdAt))
      .limit(5000)

    const header = ['createdAt', 'user', 'method', 'action', 'targetType', 'targetId', 'ip', 'device', 'os', 'browser']
    const csvRows = rows.map(({ logs: row, user: u }) =>
      [
        row.createdAt?.toISOString() || '',
        u?.name || u?.email || row.userId || '',
        row.method || '',
        row.action || '',
        row.targetType || '',
        row.targetId || '',
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
  }
  catch (err) {
    return responseError(err)
  }
})
