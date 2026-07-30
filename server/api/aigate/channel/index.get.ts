import { and, asc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '@/db/drizzle'
import { aiModel, apiLog, channel, channelCredential } from '@/db/schema'

const channelStatuses = ['enabled', 'disabled'] as const
type ChannelStatus = (typeof channelStatuses)[number]

function isChannelStatus(status: unknown): status is ChannelStatus {
  return typeof status === 'string' && channelStatuses.includes(status as ChannelStatus)
}

export default defineEventHandler(async (event) => {
  try {
    const principal = event.context.principal as { isAdmin?: boolean } | undefined
    if (!principal?.isAdmin) {
      return responseError(null, '当前账号无权访问该资源', { statusCode: 403 })
    }

    const query = getQuery(event)
    const page = Math.max(1, Number(query.page) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
    const offset = (page - 1) * pageSize
    const conditions = []
    if (query.keyword) {
      conditions.push(or(ilike(channel.name, `%${query.keyword}%`), ilike(channel.vendor, `%${query.keyword}%`)))
    }
    if (isChannelStatus(query.status))
      conditions.push(eq(channel.status, query.status))
    const where = conditions.length ? and(...conditions) : undefined

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(channel)
      .where(where)
    const data = await db
      .select()
      .from(channel)
      .where(where)
      .orderBy(asc(channel.priority))
      .limit(pageSize)
      .offset(offset)
    const channelIds = data.map(item => item.id)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
    const credentialStats = channelIds.length
      ? await db
          .select({
            channelId: channelCredential.channelId,
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${channelCredential.status} = 'active')::int`,
          })
          .from(channelCredential)
          .where(inArray(channelCredential.channelId, channelIds))
          .groupBy(channelCredential.channelId)
      : []
    const channelModels = channelIds.length
      ? await db
          .select({ sourceChannelId: aiModel.sourceChannelId, name: aiModel.name })
          .from(aiModel)
          .where(inArray(aiModel.sourceChannelId, channelIds))
      : []
    const modelNames = channelModels.map(row => row.name)
    const modelCallRows = modelNames.length
      ? await db
          .select({
            model: apiLog.model,
            calls: sql<number>`count(*)::int`,
          })
          .from(apiLog)
          .where(and(inArray(apiLog.model, modelNames), gte(apiLog.createdAt, sevenDaysAgo)))
          .groupBy(apiLog.model)
      : []
    const callsByChannel = new Map<string, number>()
    for (const row of channelModels) {
      if (!row.sourceChannelId)
        continue
      const modelCalls = modelCallRows.find(item => item.model === row.name)?.calls ?? 0
      callsByChannel.set(row.sourceChannelId, (callsByChannel.get(row.sourceChannelId) ?? 0) + modelCalls)
    }
    const enriched = data.map((item) => {
      const stat = credentialStats.find(row => row.channelId === item.id)
      return {
        ...item,
        apiKey: undefined,
        credentialCount: stat?.total ?? 0,
        activeCredentialCount: stat?.active ?? 0,
        calls7d: callsByChannel.get(item.id) ?? 0,
      }
    })
    return responseSuccess(query.page ? { items: enriched, total: countRow?.total || 0, page, pageSize } : enriched)
  }
  catch (err) {
    return responseError(err)
  }
})
