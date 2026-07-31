const dayPattern = /^\d{4}-\d{2}-\d{2}$/

export function utcDayRange(from: string, to: string) {
  const params: Record<string, string> = {}
  if (dayPattern.test(from)) params.from = `${from}T00:00:00Z`
  if (dayPattern.test(to)) {
    const end = new Date(`${to}T00:00:00Z`)
    end.setUTCDate(end.getUTCDate() + 1)
    params.to = end.toISOString().replace('.000Z', 'Z')
  }
  return params
}
