import { escapeCsvCell, flattenObject } from '@/utils/export'

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
    if (data.length === 0) return

    const flattened = data.map(item => flattenObject(item))
    const headers = [...new Set(flattened.flatMap(Object.keys))]
    const rows = [headers.join(','), ...flattened.map(row => headers.map(h => escapeCsvCell(row[h])).join(','))]
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
