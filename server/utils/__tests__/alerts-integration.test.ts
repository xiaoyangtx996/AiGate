import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateChannelDownAlerts,
  generateErrorSpikeAlerts,
  generateExpiredKeyAlerts,
  generateKeyExpiryAlerts,
  generateKnowledgeStorageAlerts,
  generateMcpUnavailableAlerts,
  generateQuotaAlerts,
  generateRuleBasedAlerts,
  runAlertChecks,
  runDailyAlertChecks,
  runRealtimeAlertChecks,
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
  alert: { type: 'type', organizationId: 'organizationId', read: 'read', status: 'status', resourceId: 'resourceId' },
  channel: { id: 'id', name: 'name', status: 'status', health: 'health' },
  channelCredential: { id: 'id', name: 'name', status: 'status' },
  mcpTool: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
    connectionStatus: 'connectionStatus',
    healthStatus: 'healthStatus',
    lastError: 'lastError',
  },
  storageInstance: { id: 'id', status: 'status', config: 'config' },
  knowledgeBase: {
    id: 'id',
    name: 'name',
    enabled: 'enabled',
    size: 'size',
    storageInstanceId: 'storageInstanceId',
    organizationId: 'organizationId',
  },
  apiLog: {
    status: 'status',
    statusCode: 'statusCode',
    createdAt: 'createdAt',
    organizationId: 'organizationId',
    type: 'type',
    agentId: 'agentId',
    cost: 'cost',
  },
  agent: { id: 'id', name: 'name', organizationId: 'organizationId' },
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

  describe('additional alert generators', () => {
    it('should create critical alert for expired API keys', async () => {
      const key = {
        id: 'key-expired',
        name: 'Expired Key',
        status: 'expired',
        expiresAt: new Date(Date.now() - 86400000),
        organizationId: 'org-1',
        userId: 'user-1',
      }
      mockSelect.mockReturnValueOnce(createSelectChain([key])).mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-expired' }]))

      await generateExpiredKeyAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-expired', ['email'])
    })

    it('should create alert for unhealthy enabled channels', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain([{ id: 'ch-1', name: 'OpenAI', status: 'enabled', health: 'down' }]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-channel' }]))

      await generateChannelDownAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-channel', ['email'])
    })

    it('should create alert for unavailable MCP tools', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain([
          { id: 'mcp-1', name: 'GitHub MCP', organizationId: 'org-1', connectionStatus: 'failed', healthStatus: 'down', lastError: 'timeout' },
        ]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-mcp' }]))

      await generateMcpUnavailableAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-mcp', ['email'])
    })

    it('should create alert when knowledge base storage exceeds configured capacity threshold', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain([{ id: 'storage-1', status: 'active', config: { capacityBytes: 1000 } }]))
        .mockReturnValueOnce(createSelectChain([
          { id: 'kb-1', name: 'KB', enabled: true, size: 850, storageInstanceId: 'storage-1', organizationId: 'org-1' },
        ]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-kb' }]))

      await generateKnowledgeStorageAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-kb', ['email'])
    })

    it('should create alert when recent API errors exceed threshold', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectChain(Array.from({ length: 10 }).fill({ organizationId: 'org-1', status: 'error', statusCode: 500 })))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-errors' }]))

      await generateErrorSpikeAlerts(10)

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-errors', ['email'])
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

    it('should create MCP unavailable alert from rule channels', async () => {
      const rules = [
        {
          id: 'r-mcp',
          name: 'MCP Rule',
          type: 'mcp_unavailable',
          enabled: true,
          organizationId: 'org-1',
          condition: { threshold: 1 },
          notifyChannels: ['in_app'],
        },
      ]
      mockSelect
        .mockReturnValueOnce(createSelectChain(rules))
        .mockReturnValueOnce(createSelectChain([
          { id: 'mcp-1', name: 'GitHub MCP', organizationId: 'org-1', connectionStatus: 'failed', healthStatus: 'down', lastError: 'timeout' },
        ]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-rule-mcp' }]))

      await generateRuleBasedAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-rule-mcp', ['in_app'])
    })

    it('should create error spike alert when rule threshold is met', async () => {
      const rules = [
        {
          id: 'r-error',
          name: 'Error Rule',
          type: 'error_spike',
          enabled: true,
          organizationId: 'org-1',
          condition: { threshold: 2 },
          notifyChannels: ['email'],
        },
      ]
      mockSelect
        .mockReturnValueOnce(createSelectChain(rules))
        .mockReturnValueOnce(createSelectChain([
          { organizationId: 'org-1', status: 'error', statusCode: 500 },
          { organizationId: 'org-1', status: 'error', statusCode: 500 },
        ]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-rule-error' }]))

      await generateRuleBasedAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-rule-error', ['email'])
    })

    it('should create knowledge storage alert from configured capacity rule', async () => {
      const rules = [
        {
          id: 'r-kb',
          name: 'KB Rule',
          type: 'knowledge_storage',
          enabled: true,
          organizationId: 'org-1',
          condition: { threshold: 80 },
          notifyChannels: ['email'],
        },
      ]
      mockSelect
        .mockReturnValueOnce(createSelectChain(rules))
        .mockReturnValueOnce(createSelectChain([{ id: 'storage-1', status: 'active', config: { capacityBytes: 1000 } }]))
        .mockReturnValueOnce(createSelectChain([
          { id: 'kb-1', name: 'KB', enabled: true, size: 900, storageInstanceId: 'storage-1', organizationId: 'org-1' },
        ]))
        .mockReturnValueOnce(createSelectChain([]))
      mockInsert.mockReturnValue(createInsertChain([{ id: 'alert-rule-kb' }]))

      await generateRuleBasedAlerts()

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockNotify).toHaveBeenCalledWith('alert-rule-kb', ['email'])
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

  describe('alert check tiers', () => {
    it('should run realtime and daily tiers separately', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      await runRealtimeAlertChecks()
      await runDailyAlertChecks()

      expect(mockSelect).toHaveBeenCalled()
    })
  })
})
