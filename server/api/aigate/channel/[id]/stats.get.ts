import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { apiLog, channel } from '@/db/schema'

export default defineEventHandler(async event => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean; organizationId?: string | null } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const id = getRouterParam(event, 'id')

    // 1. 获取 channel 信息
    const [ch] = await db.select().from(channel).where(eq(channel.id, id!))
    if (!ch) {
      return responseError(null, '渠道不存在', { statusCode: 404 })
    }

    // 2. 获取该 channel 的 API 日志统计（近24小时）
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // 总请求数
    const totalRequests = await db
      .select({ count: sql<number>`count(*)` })
      .from(apiLog)
      .where(
        and(
          eq(apiLog.provider, ch.vendor),
          principal?.organizationId ? eq(apiLog.organizationId, principal.organizationId) : sql`true`,
        ),
      )

    // 成功率
    const successCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(apiLog)
      .where(
        and(
          eq(apiLog.provider, ch.vendor),
          eq(apiLog.status, 'success'),
          principal?.organizationId ? eq(apiLog.organizationId, principal.organizationId) : sql`true`,
        ),
      )

    // 平均延迟
    const avgLatency = await db
      .select({ avg: sql<number>`avg(${apiLog.latency})` })
      .from(apiLog)
      .where(
        and(
          eq(apiLog.provider, ch.vendor),
          principal?.organizationId ? eq(apiLog.organizationId, principal.organizationId) : sql`true`,
        ),
      )

    // 最近24小时趋势（按小时分组）
    const trendData = await db
      .select({
        hour: sql<string>`to_char(${apiLog.createdAt}, 'YYYY-MM-DD HH24:00')`,
        count: sql<number>`count(*)`,
        success: sql<number>`count(*) filter (where ${apiLog.status} = 'success')`,
        avgLatency: sql<number>`avg(${apiLog.latency})`,
      })
      .from(apiLog)
      .where(
        and(
          eq(apiLog.provider, ch.vendor),
          principal?.organizationId ? eq(apiLog.organizationId, principal.organizationId) : sql`true`,
          sql`${apiLog.createdAt} >= ${twentyFourHoursAgo}`,
        ),
      )
      .groupBy(sql`to_char(${apiLog.createdAt}, 'YYYY-MM-DD HH24:00')`)
      .orderBy(sql`to_char(${apiLog.createdAt}, 'YYYY-MM-DD HH24:00')`)

    const total = totalRequests[0]?.count || 0
    const success = successCount[0]?.count || 0
    const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0'
    const avgMs = Math.round(avgLatency[0]?.avg || 0)

    // 计算24小时请求趋势数据（填充缺失小时）
    const hours = []
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000)
      const hourStr = hour.toISOString().slice(0, 13).replace('T', ' ')
      const existing = trendData.find(t => t.hour === hourStr)
      hours.push({
        time: hourStr,
        requests: existing?.count || 0,
        success: existing?.success || 0,
        avgLatency: Math.round(existing?.avgLatency || 0),
      })
    }

    return responseSuccess({
      channel: ch,
      stats: {
        totalRequests: total,
        successRate: `${successRate}%`,
        avgLatency: avgMs,
        trend: hours,
      },
    })
  } catch (err) {
    return responseError(err)
  }
})
