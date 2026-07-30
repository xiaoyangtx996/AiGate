import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from '../../aigate/__tests__/nitro-test-utils'
import settingsPostHandler from '../settings/index.post'

const mockListSettings = vi.fn()
const mockSetSetting = vi.fn()
const mockAuditLog = vi.fn()

vi.mock('#server/utils/system-settings', () => ({
  listSettings: (...args: unknown[]) => mockListSettings(...args),
  setSetting: (...args: unknown[]) => mockSetSetting(...args),
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

describe('system settings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListSettings.mockResolvedValue({
      'retention.apiLogDays': 180,
      'retention.operationLogDays': 365,
      'advanced.gatewayDebug': false,
    })
    mockSetSetting.mockResolvedValue({ id: 'setting-1' })
  })

  it('should reject non-admin principals', async () => {
    const response = await settingsPostHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', isAdmin: false } },
        body: { values: { 'base.platformName': 'AiGate' } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockSetSetting).not.toHaveBeenCalled()
  })

  it('should require confirmation when retention days are shortened', async () => {
    const response = await settingsPostHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        body: { values: { 'retention.apiLogDays': 90 } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(response.msg).toBe('Sensitive settings change requires confirmation')
    expect(mockSetSetting).not.toHaveBeenCalled()
  })

  it('should require confirmation when gateway debug is enabled', async () => {
    const response = await settingsPostHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        body: { values: { 'advanced.gatewayDebug': true } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(mockSetSetting).not.toHaveBeenCalled()
  })

  it('should save sensitive changes when confirmation is provided', async () => {
    const response = await settingsPostHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        body: {
          confirmSensitive: true,
          values: {
            'retention.apiLogDays': 90,
            'advanced.gatewayDebug': true,
          },
        },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(mockSetSetting).toHaveBeenCalledTimes(2)
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      'system_setting.update',
      { type: 'system_setting', id: 'global' },
      expect.anything(),
      expect.anything(),
    )
  })
})
