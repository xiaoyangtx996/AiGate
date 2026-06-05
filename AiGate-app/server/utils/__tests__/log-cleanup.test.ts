import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDelete = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  apiLog: { createdAt: 'createdAt' },
}))

import { cleanupOldApiLogs } from '../log-cleanup'

const RETENTION_DAYS = 180

function getLogCleanupCutoff(now: Date) {
  return new Date(now.getTime() - RETENTION_DAYS * 86400000)
}

describe('log-cleanup utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('pure log cleanup helpers', () => {
    it('getLogCleanupCutoff should subtract 180 days from now', () => {
      const now = new Date('2026-06-05T12:00:00.000Z')
      const cutoff = getLogCleanupCutoff(now)
      expect(cutoff.toISOString()).toBe('2025-12-07T12:00:00.000Z')
    })
  })

  describe('cleanupOldApiLogs', () => {
    it('should delete logs older than retention window and return count', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-05T12:00:00.000Z'))

      const deletedRows = [{ id: 'log-1' }, { id: 'log-2' }]
      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(deletedRows),
        }),
      })

      const result = await cleanupOldApiLogs()

      expect(mockDelete).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        deleted: 2,
        cutoffDate: '2025-12-07T12:00:00.000Z',
      })
    })

    it('should return zero deleted when no old logs exist', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))

      mockDelete.mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      })

      const result = await cleanupOldApiLogs()

      expect(result).toEqual({
        deleted: 0,
        cutoffDate: '2025-07-05T00:00:00.000Z',
      })
    })
  })
})
