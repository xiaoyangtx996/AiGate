import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import alertCheckHandler from '../alert/check.post'

import cleanupHandler from '../api-log/cleanup.post'
import billingGenerateHandler from '../billing/generate.post'
import { createMockEvent, expectForbidden } from './nitro-test-utils'

const mockCleanupOldApiLogs = vi.fn()
const mockRunAlertChecks = vi.fn()
const mockGenerateBillingForPeriod = vi.fn()
const mockGetCurrentPeriod = vi.fn()

vi.mock('#server/utils/log-cleanup', () => ({
  cleanupOldApiLogs: (...args: unknown[]) => mockCleanupOldApiLogs(...args),
}))

vi.mock('#server/utils/alerts', () => ({
  runAlertChecks: (...args: unknown[]) => mockRunAlertChecks(...args),
}))

vi.mock('#server/utils/billing', () => ({
  generateBillingForPeriod: (...args: unknown[]) => mockGenerateBillingForPeriod(...args),
  getCurrentPeriod: (...args: unknown[]) => mockGetCurrentPeriod(...args),
}))

describe('aigate admin handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('api-log cleanup.post', () => {
    it('should reject non-admin principals', async () => {
      const event = createMockEvent({ context: { principal: { isAdmin: false } } })
      const response = await cleanupHandler(event)

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
  })

  describe('alert check.post', () => {
    it('should reject non-admin principals', async () => {
      const event = createMockEvent({ context: { principal: { role: 'user' } } })
      const response = await alertCheckHandler(event)

      expectForbidden(response)
      expect(mockRunAlertChecks).not.toHaveBeenCalled()
    })

    it('should run alert checks for admin principals', async () => {
      mockRunAlertChecks.mockResolvedValue(undefined)

      const event = createMockEvent({ context: { principal: { isAdmin: true } } })
      const response = await alertCheckHandler(event)

      expect(mockRunAlertChecks).toHaveBeenCalledTimes(1)
      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ message: '告警检查完成' })
    })
  })

  describe('billing generate.post', () => {
    it('should reject non-admin principals', async () => {
      const event = createMockEvent({
        context: { principal: { isAdmin: false } },
        body: { period: '2026-05' },
      })
      const response = await billingGenerateHandler(event)

      expectForbidden(response)
      expect(mockGenerateBillingForPeriod).not.toHaveBeenCalled()
    })

    it('should use request period when provided', async () => {
      mockGenerateBillingForPeriod.mockResolvedValue({ created: 2, updated: 1 })

      const event = createMockEvent({
        context: { principal: { isAdmin: true } },
        body: { period: '2026-05' },
      })
      const response = await billingGenerateHandler(event)

      expect(mockGetCurrentPeriod).not.toHaveBeenCalled()
      expect(mockGenerateBillingForPeriod).toHaveBeenCalledWith('2026-05')
      expect(response.data).toEqual({ created: 2, updated: 1 })
    })

    it('should fall back to current period when body is empty', async () => {
      mockGetCurrentPeriod.mockResolvedValue('2026-06')
      mockGenerateBillingForPeriod.mockResolvedValue({ created: 0, updated: 0 })

      const event = createMockEvent({ context: { principal: { isAdmin: true } } })
      const response = await billingGenerateHandler(event)

      expect(mockGetCurrentPeriod).toHaveBeenCalledTimes(1)
      expect(mockGenerateBillingForPeriod).toHaveBeenCalledWith('2026-06')
      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    })
  })
})
