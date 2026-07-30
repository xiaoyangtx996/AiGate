import { describe, expect, it } from 'vitest'
import {
  decodeCreatedAtCursor,
  encodeCreatedAtCursor,
  getNextCreatedAtCursor,
  parseListPagination,
  shouldReturnPaginatedResponse,
} from '../pagination'

describe('pagination utils', () => {
  it('should parse offset pagination params', () => {
    expect(parseListPagination({})).toEqual({ page: 1, pageSize: 20, offset: 0 })
    expect(parseListPagination({ page: '0', pageSize: '500' })).toEqual({ page: 1, pageSize: 100, offset: 0 })
    expect(parseListPagination({ page: '3', pageSize: '25' })).toEqual({ page: 3, pageSize: 25, offset: 50 })
    expect(parseListPagination({ page: 'abc', pageSize: 'xyz' })).toEqual({ page: 1, pageSize: 20, offset: 0 })
  })

  it('should detect paginated response requests', () => {
    expect(shouldReturnPaginatedResponse({})).toBe(false)
    expect(shouldReturnPaginatedResponse({ pageSize: '20' })).toBe(false)
    expect(shouldReturnPaginatedResponse({ page: '1' })).toBe(true)
  })

  it('should encode and decode createdAt cursors', () => {
    const cursor = encodeCreatedAtCursor({ id: 'log-1', createdAt: new Date('2026-06-18T08:00:00.000Z') })

    expect(cursor).toBeTruthy()
    expect(decodeCreatedAtCursor(cursor)).toEqual({
      id: 'log-1',
      createdAt: new Date('2026-06-18T08:00:00.000Z'),
    })
  })

  it('should reject malformed cursors', () => {
    expect(decodeCreatedAtCursor('bad')).toBeNull()
    expect(decodeCreatedAtCursor('')).toBeNull()
    expect(decodeCreatedAtCursor(undefined)).toBeNull()
  })

  it('should return next cursor only when page is full', () => {
    const rows = [
      { id: 'log-1', createdAt: new Date('2026-06-18T08:00:00.000Z') },
      { id: 'log-2', createdAt: new Date('2026-06-18T07:00:00.000Z') },
    ]

    expect(getNextCreatedAtCursor(rows, 3)).toBeNull()
    expect(decodeCreatedAtCursor(getNextCreatedAtCursor(rows, 2))).toEqual({
      id: 'log-2',
      createdAt: new Date('2026-06-18T07:00:00.000Z'),
    })
  })
})
