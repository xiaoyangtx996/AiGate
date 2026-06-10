import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import cleanupHandler from '../api-log/cleanup.post'

import { createMockEvent, expectForbidden } from './nitro-test-utils'

const mockCleanupOldApiLogs = vi.fn()

vi.mock('#server/utils/log-cleanup', () => ({
  cleanupOldApiLogs: (...args: unknown[]) => mockCleanupOldApiLogs(...args),
}))

describe('aigate api-log handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('api-log cleanup.post', () => {
    it('should reject non-admin principals', async () => {
      const event = createMockEvent({ context: { principal: { isAdmin: false } } })
      const response = await cleanupHandler(event)

      expectForbidden(response)
      expect(mockCleanupOldApiLogs).not.toHaveBeenCalled()
    })

    it('should reject requests without principal', async () => {
      const response = await cleanupHandler(createMockEvent())

      expectForbidden(response)
      expect(mockCleanupOldApiLogs).not.toHaveBeenCalled()
    })

    it('should run cleanup for admin principals', async () => {
      mockCleanupOldApiLogs.mockResolvedValue({ deleted: 3, cutoffDate: '2025-12-07T00:00:00.000Z' })

      const event = createMockEvent({ context: { principal: { isAdmin: true } } })
      const response = await cleanupHandler(event)

      expect(mockCleanupOldApiLogs).toHaveBeenCalledTimes(1)
      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ deleted: 3, cutoffDate: '2025-12-07T00:00:00.000Z' })
    })

    it('should return success with zero deleted count', async () => {
      mockCleanupOldApiLogs.mockResolvedValue({ deleted: 0, cutoffDate: '2025-12-07T00:00:00.000Z' })

      const event = createMockEvent({ context: { principal: { isAdmin: true } } })
      const response = await cleanupHandler(event)

      expect(mockCleanupOldApiLogs).toHaveBeenCalledTimes(1)
      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ deleted: 0, cutoffDate: '2025-12-07T00:00:00.000Z' })
    })
  })
})
