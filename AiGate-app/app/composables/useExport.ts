function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
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

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined)
    return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n'))
    return `"${str.replace(/"/g, '""')}"`
  return str
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function useExport() {
  function exportToCSV<T extends Record<string, unknown>>(data: T[], filename: string) {
    if (data.length === 0)
      return

    const flattened = data.map(item => flattenObject(item))
    const headers = [...new Set(flattened.flatMap(Object.keys))]
    const rows = [
      headers.join(','),
      ...flattened.map(row => headers.map(h => escapeCsvCell(row[h])).join(',')),
    ]
    const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${filename}.csv`)
  }

  function exportToJSON<T>(data: T[], filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${filename}.json`)
  }

  return {
    exportToCSV,
    exportToJSON,
  }
}
