import { describe, expect, it } from 'vitest'
import { escapeCsvCell, flattenObject } from '@/utils/export'

describe('flattenObject', () => {
  it('should flatten nested objects with dot notation keys', () => {
    const result = flattenObject({
      name: 'Alice',
      profile: { age: 30, city: 'Beijing' },
    })

    expect(result).toEqual({
      name: 'Alice',
      'profile.age': 30,
      'profile.city': 'Beijing',
    })
  })

  it('should serialize arrays as JSON strings', () => {
    const result = flattenObject({ tags: ['a', 'b'] })
    expect(result).toEqual({ tags: '["a","b"]' })
  })

  it('should preserve Date instances without recursing', () => {
    const date = new Date('2026-01-01T00:00:00.000Z')
    const result = flattenObject({ createdAt: date })
    expect(result.createdAt).toBe(date)
  })

  it('should handle null values', () => {
    const result = flattenObject({ note: null })
    expect(result).toEqual({ note: null })
  })
})

describe('escapeCsvCell', () => {
  it('should return empty string for null and undefined', () => {
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('should pass through plain values unchanged', () => {
    expect(escapeCsvCell('hello')).toBe('hello')
    expect(escapeCsvCell(42)).toBe('42')
  })

  it('should wrap cells containing commas in double quotes', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
  })

  it('should escape embedded double quotes', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('should wrap cells containing newlines', () => {
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
  })
})
