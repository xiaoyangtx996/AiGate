import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notifyAlertSubscribers } from '../alert-notify'

const mockSelect = vi.fn()
const mockGetSetting = vi.fn()
const mockSend = vi.fn()
const mockFetch = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  alert: { id: 'id' },
  member: { userId: 'userId', organizationId: 'organizationId' },
  user: { id: 'id', email: 'email' },
  userNotificationPref: { userId: 'userId', alertType: 'alertType' },
}))

vi.mock('#server/utils/system-settings', () => ({
  getSetting: (...args: unknown[]) => mockGetSetting(...args),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: (...args: unknown[]) => mockSend(...args) },
  })),
}))

function createWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createLeftJoinWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('alert notify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NUXT_RESEND_API_KEY = 'test-resend-key'
    mockFetch.mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'notify.emailRecipients')
        return Promise.resolve('ops@example.com, security@example.com')
      if (key === 'notify.resendFrom')
        return Promise.resolve('alerts@example.com')
      if (key === 'notify.webhookUrl')
        return Promise.resolve('https://hooks.example.com/aigate')
      return Promise.resolve('')
    })
  })

  it('should send configured recipient emails and webhook notifications', async () => {
    mockSelect.mockReturnValueOnce(
      createWhereChain([{
        id: 'alert-1',
        type: 'quota_warning',
        severity: 'warning',
        title: 'Quota',
        message: 'Quota warning',
        organizationId: null,
        userId: null,
        resourceId: 'quota:org-1:90',
      }]),
    )

    await notifyAlertSubscribers('alert-1', ['email', 'webhook'])

    expect(mockSend).toHaveBeenCalledTimes(2)
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'alerts@example.com',
      to: 'ops@example.com',
      subject: '[AiGate] Quota',
    }))
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'security@example.com',
    }))
    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.example.com/aigate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"id":"alert-1"'),
      }),
    )
  })

  it('should skip member email when notification preference disables email', async () => {
    mockGetSetting.mockImplementation((key: string) => {
      if (key === 'notify.resendFrom')
        return Promise.resolve('alerts@example.com')
      return Promise.resolve('')
    })
    mockSelect
      .mockReturnValueOnce(createWhereChain([{
        id: 'alert-1',
        type: 'quota_warning',
        severity: 'warning',
        title: 'Quota',
        message: 'Quota warning',
        organizationId: 'org-1',
        userId: null,
        resourceId: 'quota:org-1:90',
      }]))
      .mockReturnValueOnce(createLeftJoinWhereChain([
        { id: 'user-1', email: 'muted@example.com' },
        { id: 'user-2', email: 'active@example.com' },
      ]))
      .mockReturnValueOnce(createWhereChain([{ userId: 'user-1', alertType: 'quota_warning', channels: ['in_app'] }]))
      .mockReturnValueOnce(createWhereChain([{ userId: 'user-2', alertType: 'quota_warning', channels: ['in_app', 'email'] }]))

    await notifyAlertSubscribers('alert-1', ['email'])

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: 'active@example.com',
      subject: '[AiGate] Quota',
    }))
  })
})
