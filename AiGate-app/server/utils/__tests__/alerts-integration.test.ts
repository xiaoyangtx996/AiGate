import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockNotify = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: { id: 'id', name: 'name', enabled: 'enabled', tokenLimit: 'tokenLimit', tokenUsed: 'tokenUsed' },
  alert: { type: 'type', organizationId: 'organizationId', read: 'read', resourceId: 'resourceId' },
  apiKey: { status: 'status', expiresAt: 'expiresAt', id: 'id', name: 'name', organizationId: 'organizationId', userId: 'userId' },
  alertRule: { enabled: 'enabled', type: 'type', organizationId: 'organizationId', condition: 'condition', name: 'name' },
}))

vi.mock('#server/utils/alert-notify', () => ({
  notifyAlertSubscribers: (...args: unknown[]) => mockNotify(...args),
}))

import {
  generateKeyExpiryAlerts,
  generateQuotaAlerts,
  runAlertChecks,
} from '#server/utils/alerts'

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createInsertChain(result: unknown[]) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('alerts integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue(undefined)
  })

  describe('generateQuotaAlerts', () => {
    it('should create alert when usage >= 90% and no unread alert exists', async () => {
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 920 }
      mockSelect
        .mockReturnValueOnce(createSelectChain([org]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-1', type: 'quota_warning' }]))

      await generateQuotaAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-1')
    })

    it('should skip when unread quota alert already exists', async () => {
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 950 }
      mockSelect
        .mockReturnValueOnce(createSelectChain([org]))
        .mockReturnValueOnce(createSelectChain([{ id: 'existing' }]))

      await generateQuotaAlerts()

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should skip orgs with zero token limit', async () => {
      mockSelect.mockReturnValueOnce(createSelectChain([
        { id: 'org-1', name: 'Free', enabled: true, tokenLimit: 0, tokenUsed: 0 },
      ]))

      await generateQuotaAlerts()

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('generateKeyExpiryAlerts', () => {
    it('should create alert for keys expiring within 7 days', async () => {
      const expiresAt = new Date(Date.now() + 3 * 86400000)
      const key = { id: 'key-1', name: 'Prod Key', status: 'active', expiresAt, organizationId: 'org-1', userId: 'user-1' }
      mockSelect
        .mockReturnValueOnce(createSelectChain([key]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-2' }]))

      await generateKeyExpiryAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-2')
    })
  })

  describe('runAlertChecks', () => {
    it('should run rule, quota and key expiry checks in order', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      await runAlertChecks()

      expect(mockSelect).toHaveBeenCalled()
    })
  })
})
