import { describe, expect, it } from 'vitest'
import { toggleIdInSet } from '@/utils/batch'

describe('toggleIdInSet', () => {
  it('should add id when not present', () => {
    const result = toggleIdInSet(new Set(['a']), 'b')
    expect(result).toEqual(new Set(['a', 'b']))
  })

  it('should remove id when already present', () => {
    const result = toggleIdInSet(new Set(['a', 'b']), 'a')
    expect(result).toEqual(new Set(['b']))
  })

  it('should not mutate the original set', () => {
    const original = new Set(['x'])
    toggleIdInSet(original, 'y')
    expect(original).toEqual(new Set(['x']))
  })

  it('should handle empty set', () => {
    expect(toggleIdInSet(new Set(), 'id-1')).toEqual(new Set(['id-1']))
  })
})
