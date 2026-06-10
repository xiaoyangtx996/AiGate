/** 解析列表分页参数，pageSize 限制在 1–100 */
export function parseListPagination(query: Record<string, string | undefined>) {
  const page = Math.max(1, Number(query.page) || 1)
  const rawSize = query.pageSize !== undefined ? Number(query.pageSize) : 20
  const pageSize = Math.min(100, Math.max(1, Number.isFinite(rawSize) ? rawSize : 20))
  const offset = (page - 1) * pageSize
  return { page, pageSize, offset }
}

/** 仅当请求携带 page 参数时返回分页结构 */
export function shouldReturnPaginatedResponse(query: Record<string, string | undefined>) {
  return Boolean(query.page)
}
