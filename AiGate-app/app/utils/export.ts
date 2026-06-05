/** 将嵌套对象展平为点分键名，数组序列化为 JSON 字符串 */
export function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey))
    }
    else if (Array.isArray(value)) {
      result[fullKey] = JSON.stringify(value)
    }
    else {
      result[fullKey] = value
    }
  }
  return result
}

/** CSV 单元格转义：含逗号、引号或换行时用双引号包裹 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined)
    return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n'))
    return `"${str.replace(/"/g, '""')}"`
  return str
}
