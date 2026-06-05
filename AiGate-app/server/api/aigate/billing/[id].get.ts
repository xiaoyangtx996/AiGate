import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiLog, billingRecord, organization } from '@/db/schema'

function parsePeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return {
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 1),
  }
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { organizationId?: string | null } | undefined
    const id = getRouterParam(event, 'id')
    const where = principal?.organizationId
      ? and(eq(billingRecord.id, id!), eq(billingRecord.organizationId, principal.organizationId))
      : eq(billingRecord.id, id!)
    const [record] = await db.select().from(billingRecord).where(where)
    if (!record) { return responseSuccess(null, '账单不存在', 404) }

    const { startDate, endDate } = parsePeriod(record.period)
    const logConditions = [
      eq(apiLog.organizationId, record.organizationId!),
      gte(apiLog.createdAt, startDate),
      lt(apiLog.createdAt, endDate),
    ]

    const modelBreakdown = await db.select({
      model: apiLog.model,
      requests: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${apiLog.totalTokens}), 0)::int`,
      cost: sql<number>`coalesce(sum(${apiLog.cost}), 0)::int`,
    }).from(apiLog).where(and(...logConditions)).groupBy(apiLog.model).orderBy(desc(sql`sum(${apiLog.totalTokens})`))

    const dailyBreakdown = await db.select({
      date: sql<string>`to_char(${apiLog.createdAt}, 'YYYY-MM-DD')`,
      requests: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${apiLog.totalTokens}), 0)::int`,
      cost: sql<number>`coalesce(sum(${apiLog.cost}), 0)::int`,
    }).from(apiLog).where(and(...logConditions)).groupBy(sql`to_char(${apiLog.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`to_char(${apiLog.createdAt}, 'YYYY-MM-DD')`)

    let orgName = ''
    if (record.organizationId) {
      const [org] = await db.select({ name: organization.name }).from(organization).where(eq(organization.id, record.organizationId))
      orgName = org?.name || ''
    }

    return responseSuccess({
      ...record,
      organizationName: orgName,
      modelBreakdown,
      dailyBreakdown,
    })
  }
  catch (err) { return responseError(err) }
})
