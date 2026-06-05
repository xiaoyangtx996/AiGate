import { describe, expect, it } from 'vitest'
import { parseListPagination, shouldReturnPaginatedResponse } from '../pagination'

describe('pagination helpers', () => {
  describe('parseListPagination', () => {
    it('should use defaults when query params are missing', () => {
      expect(parseListPagination({})).toEqual({
        page: 1,
        pageSize: 20,
        offset: 0,
      })
    })

    it('should clamp page to minimum 1', () => {
      expect(parseListPagination({ page: '-2', pageSize: '10' })).toEqual({
        page: 1,
        pageSize: 10,
        offset: 0,
      })
    })

    it('should clamp pageSize between 1 and 100', () => {
      expect(parseListPagination({ page: '1', pageSize: '-5' })).toEqual({
        page: 1,
        pageSize: 1,
        offset: 0,
      })
      expect(parseListPagination({ page: '1', pageSize: '0' })).toEqual({
        page: 1,
        pageSize: 1,
        offset: 0,
      })
      expect(parseListPagination({ page: '1', pageSize: '500' })).toEqual({
        page: 1,
        pageSize: 100,
        offset: 0,
      })
    })

    it('should compute offset from page and pageSize', () => {
      expect(parseListPagination({ page: '3', pageSize: '25' })).toEqual({
        page: 3,
        pageSize: 25,
        offset: 50,
      })
    })

    it('should treat invalid numbers as defaults', () => {
      expect(parseListPagination({ page: 'abc', pageSize: 'xyz' })).toEqual({
        page: 1,
        pageSize: 20,
        offset: 0,
      })
    })

    it('should compute offset for large page numbers', () => {
      expect(parseListPagination({ page: '100', pageSize: '50' })).toEqual({
        page: 100,
        pageSize: 50,
        offset: 4950,
      })
    })

    it('should default pageSize to 20 when pageSize is omitted', () => {
      expect(parseListPagination({ page: '2' })).toEqual({
        page: 2,
        pageSize: 20,
        offset: 20,
      })
    })

    it('should treat non-finite pageSize as default 20', () => {
      expect(parseListPagination({ page: '1', pageSize: 'Infinity' })).toEqual({
        page: 1,
        pageSize: 20,
        offset: 0,
      })
    })
  })

  describe('shouldReturnPaginatedResponse', () => {
    it('should return paginated shape only when page query is present', () => {
      expect(shouldReturnPaginatedResponse({})).toBe(false)
      expect(shouldReturnPaginatedResponse({ pageSize: '20' })).toBe(false)
      expect(shouldReturnPaginatedResponse({ page: '1' })).toBe(true)
      expect(shouldReturnPaginatedResponse({ page: '2', pageSize: '10' })).toBe(true)
    })

    it('should treat empty page string as present', () => {
      expect(shouldReturnPaginatedResponse({ page: '' })).toBe(false)
    })

    it('should ignore unrelated query keys', () => {
      expect(shouldReturnPaginatedResponse({ search: 'agent', sort: 'desc' })).toBe(false)
    })
  })
})
