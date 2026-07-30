/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-04-30 09:04:43
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-05-06 15:44:25
 * @Description:操作日志列表
 */
import { and, desc, eq, gte, ilike, lte, sql } from 'drizzle-orm'
import { map } from 'es-toolkit/compat'
import { db } from '@/db/drizzle'
import { logs, user } from '@/db/schema'
import { createCreatedAtCursorCondition, decodeCreatedAtCursor, getNextCreatedAtCursor } from '#server/utils/pagination'

export default defineEventHandler(async (event) => {
  try {
    const query = LogQuerySchema.parse(getQuery(event))
    const { userId, method, action, targetType, startTime, endTime, page, pageSize } = query
    const cursor = decodeCreatedAtCursor(query.cursor)

    const conditions = []

    if (userId) {
      conditions.push(eq(logs.userId, userId))
    }

    if (method) {
      conditions.push(eq(logs.method, method))
    }
    if (action) {
      conditions.push(ilike(logs.action, `%${action}%`))
    }
    if (targetType) {
      conditions.push(eq(logs.targetType, targetType))
    }
    if (startTime) {
      conditions.push(gte(logs.createdAt, new Date(startTime)))
    }
    if (endTime) {
      conditions.push(lte(logs.createdAt, new Date(endTime)))
    }
    const cursorCondition = createCreatedAtCursorCondition(logs, cursor)
    if (cursorCondition) {
      conditions.push(cursorCondition)
    }

    const where = conditions.length ? and(...conditions) : undefined

    const listQuery = db
      .select()
      .from(logs)
      .leftJoin(user, eq(logs.userId, user.id))
      .where(where)
      .orderBy(desc(logs.createdAt), desc(logs.id))
      .limit(pageSize)
      .offset(cursor ? 0 : (page - 1) * pageSize)

    const [list, totalResult] = await Promise.all([
      listQuery,
      cursor
        ? Promise.resolve([{ count: 0 }])
        : db
            .select({ count: sql<number>`count(*)` })
            .from(logs)
            .where(where),
    ])

    const total = Number(totalResult[0]?.count || 0)
    const data = map(list, v => ({ ...v.logs, user: v.user }))

    return responseSuccess({
      list: data,
      total,
      nextCursor: getNextCreatedAtCursor(data, pageSize),
    })
  }
  catch (err) {
    return responseError(err)
  }
})
