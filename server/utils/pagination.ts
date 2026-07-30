import { and, eq, lt, or } from 'drizzle-orm'

export function parseListPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1)
  const rawSize = query.pageSize !== undefined ? Number(query.pageSize) : 20
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(rawSize) ? rawSize : 20))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

export function shouldReturnPaginatedResponse(query: Record<string, string | undefined>) {
  return Boolean(query.page)
}

export interface CreatedAtCursor {
  createdAt: Date
  id: string
}

export function encodeCreatedAtCursor(row: { createdAt: Date | string | null, id: string }) {
  if (!row.createdAt || !row.id)
    return null

  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)
  if (Number.isNaN(createdAt.getTime()))
    return null

  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id: row.id }), 'utf8').toString('base64url')
}

export function decodeCreatedAtCursor(cursor: unknown): CreatedAtCursor | null {
  if (typeof cursor !== 'string' || !cursor)
    return null

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { createdAt?: string, id?: string }
    if (!parsed.createdAt || !parsed.id)
      return null

    const createdAt = new Date(parsed.createdAt)
    if (Number.isNaN(createdAt.getTime()))
      return null

    return { createdAt, id: parsed.id }
  }
  catch {
    return null
  }
}

export function createCreatedAtCursorCondition(
  columns: { createdAt: any, id: any },
  cursor: CreatedAtCursor | null,
) {
  if (!cursor)
    return undefined

  return or(
    lt(columns.createdAt, cursor.createdAt),
    and(eq(columns.createdAt, cursor.createdAt), lt(columns.id, cursor.id)),
  )
}

export function getNextCreatedAtCursor<T extends { createdAt: Date | string | null, id: string }>(items: T[], pageSize: number) {
  if (items.length < pageSize)
    return null

  const last = items.at(-1)
  return last ? encodeCreatedAtCursor(last) : null
}
