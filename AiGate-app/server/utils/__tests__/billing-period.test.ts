import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCurrentPeriod } from '../billing'

function parseBillingPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return {
    year,
    month,
    startDate: new Date(year!, month! - 1, 1),
    endDate: new Date(year!, month!, 1),
    dueDate: new Date(year!, month!, 15),
  }
}

function formatBillingPeriod(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isValidBillingPeriod(period: string) {
  return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(period)
}

describe('billing period utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCurrentPeriod', () => {
    it('should return current year-month', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T08:00:00Z'))

      await expect(getCurrentPeriod()).resolves.toBe('2026-06')
    })

    it('should zero-pad months before October', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-03-01T00:00:00Z'))

      await expect(getCurrentPeriod()).resolves.toBe('2026-03')
    })

    it('should handle December correctly', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 11, 31, 12, 0, 0))

      await expect(getCurrentPeriod()).resolves.toBe('2026-12')
    })
  })

  describe('pure billing period helpers', () => {
    it('parseBillingPeriod should derive billing window dates', () => {
      const { startDate, endDate, dueDate } = parseBillingPeriod('2024-03')

      expect(startDate).toEqual(new Date(2024, 2, 1))
      expect(endDate).toEqual(new Date(2024, 3, 1))
      expect(dueDate).toEqual(new Date(2024, 3, 15))
    })

    it('formatBillingPeriod should mirror getCurrentPeriod formatting', () => {
      expect(formatBillingPeriod(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01')
      expect(formatBillingPeriod(new Date('2026-11-15T12:00:00Z'))).toBe('2026-11')
    })

    it('isValidBillingPeriod should validate YYYY-MM format', () => {
      expect(isValidBillingPeriod('2026-06')).toBe(true)
      expect(isValidBillingPeriod('2026-13')).toBe(false)
      expect(isValidBillingPeriod('26-06')).toBe(false)
      expect(isValidBillingPeriod('2026-6')).toBe(false)
    })
  })
})
