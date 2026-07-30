import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent, expectForbidden } from '../../aigate/__tests__/nitro-test-utils'
import cleanupHandler from '../operation-log/cleanup.post'

const mockCleanupOldOperationLogs = vi.fn()

vi.mock('#server/utils/log-cleanup', () => ({
  cleanupOldOperationLogs: (...args: unknown[]) => mockCleanupOldOperationLogs(...args),
}))

describe('system-settings operation-log cleanup handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject non-admin principals', async () => {
    const response = await cleanupHandler(createMockEvent({ context: { principal: { isAdmin: false } } }))

    expectForbidden(response)
    expect(mockCleanupOldOperationLogs).not.toHaveBeenCalled()
  })

  it('should run cleanup for admin principals', async () => {
    mockCleanupOldOperationLogs.mockResolvedValue({ deleted: 2, cutoffDate: '2025-06-05T12:00:00.000Z' })

    const response = await cleanupHandler(createMockEvent({ context: { principal: { isAdmin: true } } }))

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({ deleted: 2, cutoffDate: '2025-06-05T12:00:00.000Z' })
    expect(mockCleanupOldOperationLogs).toHaveBeenCalledTimes(1)
  })
})
