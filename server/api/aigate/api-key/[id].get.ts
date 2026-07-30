import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiKey, apiLog, logs } from '@/db/schema'

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean, organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')
    const where = principal.organizationId
      ? and(eq(apiKey.id, id!), eq(apiKey.organizationId, principal.organizationId))
      : eq(apiKey.id, id!)
    const [record] = await db.select().from(apiKey).where(where)
    if (!record) {
      return responseError(null, '资源不存在或无权操作', { statusCode: 404 })
    }

    const since = new Date()
    since.setDate(since.getDate() - 29)
    since.setHours(0, 0, 0, 0)
    const logWhere = and(eq(apiLog.apiKeyId, record.id), gte(apiLog.createdAt, since))

    const [usage30d, topModels, auditRows] = await Promise.all([
      db
        .select({
          date: sql<string>`to_char(${apiLog.createdAt}, 'YYYY-MM-DD')`,
          calls: sql<number>`count(*)::int`,
          tokens: sql<number>`coalesce(sum(${apiLog.totalTokens}), 0)::int`,
          cost: sql<number>`coalesce(sum(${apiLog.cost}), 0)`,
        })
        .from(apiLog)
        .where(logWhere)
        .groupBy(sql`to_char(${apiLog.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${apiLog.createdAt}, 'YYYY-MM-DD')`),

      db
        .select({
          model: sql<string>`coalesce(${apiLog.model}, 'unknown')`,
          calls: sql<number>`count(*)::int`,
          tokens: sql<number>`coalesce(sum(${apiLog.totalTokens}), 0)::int`,
          cost: sql<number>`coalesce(sum(${apiLog.cost}), 0)`,
        })
        .from(apiLog)
        .where(logWhere)
        .groupBy(sql`coalesce(${apiLog.model}, 'unknown')`)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      db
        .select({
          action: logs.action,
          userId: logs.userId,
          createdAt: logs.createdAt,
        })
        .from(logs)
        .where(and(eq(logs.targetType, 'api_key'), eq(logs.targetId, record.id)))
        .orderBy(desc(logs.createdAt))
        .limit(20),
    ])

    return responseSuccess({
      ...record,
      usage30d,
      topModels,
      lifecycle: [
        { action: 'api_key.create', createdAt: record.createdAt, userId: record.userId },
        ...auditRows,
      ],
    })
  }
  catch (err) {
    return responseError(err)
  }
})
