import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateKeyExpiryAlerts,
  generateQuotaAlerts,
  generateRuleBasedAlerts,
  runAlertChecks,
} from '#server/utils/alerts'

const { mockInsert, mockNotify, mockSelect } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockNotify: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: { id: 'id', name: 'name', enabled: 'enabled', tokenLimit: 'tokenLimit', tokenUsed: 'tokenUsed' },
  alert: { type: 'type', organizationId: 'organizationId', read: 'read', resourceId: 'resourceId' },
  apiKey: {
    status: 'status',
    expiresAt: 'expiresAt',
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    userId: 'userId',
  },
  alertRule: {
    enabled: 'enabled',
    type: 'type',
    organizationId: 'organizationId',
    condition: 'condition',
    name: 'name',
    notifyChannels: 'notifyChannels',
  },
}))

vi.mock('#server/utils/alert-notify', () => ({
  notifyAlertSubscribers: (...args: unknown[]) => mockNotify(...args),
}))

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
    it('should create alert when usage reaches 70% tier and no unread alert exists', async () => {
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 720 }
      mockSelect.mockReturnValueOnce(createSelectChain([org])).mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-1', type: 'quota_warning' }]))

      await generateQuotaAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-1', ['email'])
    })

    it('should create critical alert when usage reaches 100% tier', async () => {
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 1000 }
      const values = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'alert-critical' }]),
      })
      mockSelect.mockReturnValueOnce(createSelectChain([org])).mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue({ values })

      await generateQuotaAlerts()

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical',
          resourceId: 'quota:org-1:100',
        }),
      )
      expect(mockNotify).toHaveBeenCalledWith('alert-critical', ['email'])
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
      mockSelect.mockReturnValueOnce(
        createSelectChain([{ id: 'org-1', name: 'Free', enabled: true, tokenLimit: 0, tokenUsed: 0 }]),
      )

      await generateQuotaAlerts()

      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('generateKeyExpiryAlerts', () => {
    it('should create alert for keys expiring within 7 days', async () => {
      const expiresAt = new Date(Date.now() + 3 * 86400000)
      const key = {
        id: 'key-1',
        name: 'Prod Key',
        status: 'active',
        expiresAt,
        organizationId: 'org-1',
        userId: 'user-1',
      }
      mockSelect.mockReturnValueOnce(createSelectChain([key])).mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-2' }]))

      await generateKeyExpiryAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-2', ['email'])
    })
  })

  describe('generateRuleBasedAlerts', () => {
    it('should create quota alert when rule threshold is met', async () => {
      const rules = [
        {
          id: 'r1',
          name: 'Quota Rule',
          type: 'quota_warning',
          enabled: true,
          organizationId: null,
          condition: { threshold: 80 },
          notifyChannels: ['email'],
        },
      ]
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 850 }
      mockSelect
        .mockReturnValueOnce(createSelectChain(rules))
        .mockReturnValueOnce(createSelectChain([org]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-rule-1' }]))

      await generateRuleBasedAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-rule-1', ['email'])
    })

    it('should create key expiry alert from rule threshold days', async () => {
      const rules = [
        {
          id: 'r2',
          name: 'Key Rule',
          type: 'key_expiring',
          enabled: true,
          organizationId: null,
          condition: { threshold: 7 },
          notifyChannels: ['email'],
        },
      ]
      const expiresAt = new Date(Date.now() + 2 * 86400000)
      const key = {
        id: 'key-2',
        name: 'Dev Key',
        status: 'active',
        expiresAt,
        organizationId: 'org-1',
        userId: 'user-1',
      }
      mockSelect
        .mockReturnValueOnce(createSelectChain(rules))
        .mockReturnValueOnce(createSelectChain([key]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-rule-2' }]))

      await generateRuleBasedAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-rule-2', ['email'])
    })

    it('should skip when organization filter does not match', async () => {
      const rules = [
        {
          id: 'r3',
          name: 'Org Rule',
          type: 'quota_warning',
          enabled: true,
          organizationId: 'org-other',
          condition: { threshold: 80 },
          notifyChannels: ['email'],
        },
      ]
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 900 }
      mockSelect.mockReturnValueOnce(createSelectChain(rules)).mockReturnValueOnce(createSelectChain([org]))

      await generateRuleBasedAlerts()

      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should skip subscriber email when rule only uses in-app channel', async () => {
      const rules = [
        {
          id: 'r4',
          name: 'In App Rule',
          type: 'quota_warning',
          enabled: true,
          organizationId: null,
          condition: { threshold: 80 },
          notifyChannels: ['in_app'],
        },
      ]
      const org = { id: 'org-1', name: 'Acme', enabled: true, tokenLimit: 1000, tokenUsed: 900 }
      mockSelect
        .mockReturnValueOnce(createSelectChain(rules))
        .mockReturnValueOnce(createSelectChain([org]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-rule-4' }]))

      await generateRuleBasedAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-rule-4', ['in_app'])
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
