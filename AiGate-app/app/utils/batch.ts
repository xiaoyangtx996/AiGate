/** Toggle a single id in a selection set (immutable). */
export function toggleIdInSet(current: Set<string>, id: string): Set<string> {
  const next = new Set(current)
  if (next.has(id))
    next.delete(id)
  else
    next.add(id)
  return next
}
