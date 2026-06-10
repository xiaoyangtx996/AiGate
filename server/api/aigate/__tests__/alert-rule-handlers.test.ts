import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import alertRuleListHandler from '../alert/rule/index.get'
import alertRulePostHandler from '../alert/rule/index.post'
import { createMockEvent } from './nitro-test-utils'

const { mockInsert, mockSelect } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  alertRule: {
    organizationId: 'organizationId',
    createdAt: 'createdAt',
    name: 'name',
    type: 'type',
    condition: 'condition',
    enabled: 'enabled',
    notifyChannels: 'notifyChannels',
  },
}))

function createListSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(result),
      }),
      orderBy: vi.fn().mockResolvedValue(result),
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

describe('aigate alert rule handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('alert rule index.get', () => {
    it('should scope rules to principal organization', async () => {
      const rules = [{ id: 'rule-1', name: 'Quota 90%', type: 'quota_warning' }]
      mockSelect.mockReturnValue(createListSelectChain(rules))

      const response = await alertRuleListHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(rules)
    })

    it('should return all rules when principal has no organization', async () => {
      const rules = [{ id: 'rule-2', name: 'Global rule' }]
      mockSelect.mockReturnValue(createListSelectChain(rules))

      const response = await alertRuleListHandler(createMockEvent())

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(rules)
    })
  })

  describe('alert rule index.post', () => {
    it('should create rule with organization from principal', async () => {
      const created = { id: 'rule-new', name: 'Key expiry', type: 'key_expiring', enabled: true }
      mockInsert.mockReturnValue(createInsertChain([created]))

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: {
            name: 'Key expiry',
            type: 'key_expiring',
            enabled: true,
            condition: { threshold: 7 },
            notifyChannels: ['in_app'],
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should default enabled to true when omitted', async () => {
      const created = { id: 'rule-default-enabled', name: 'Quota', type: 'quota_warning', enabled: true }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Quota', type: 'quota_warning' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
    })

    it('should default condition to quota template when omitted', async () => {
      const created = { id: 'rule-default-condition', name: 'Usage', type: 'usage_spike', enabled: true }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Usage', type: 'usage_spike', enabled: true },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: { templateId: 'quota_90', threshold: 90 },
        }),
      )
    })

    it('should default notifyChannels to empty array when omitted', async () => {
      const created = { id: 'rule-default-channels', name: 'Budget', type: 'budget_limit', enabled: true }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Budget', type: 'budget_limit', enabled: true, condition: {} },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ notifyChannels: ['in_app', 'email'] }))
    })

    it('should apply quota rule template defaults', async () => {
      const created = { id: 'rule-template', name: 'Quota 70%', type: 'quota_warning', enabled: true }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: {
            name: 'Quota 70%',
            condition: { templateId: 'quota_70' },
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quota_warning',
          condition: { templateId: 'quota_70', threshold: 70 },
          notifyChannels: ['in_app'],
        }),
      )
    })

    it('should create rule without principal organization', async () => {
      const created = { id: 'rule-global', name: 'Global', type: 'system', enabled: true }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          body: {
            name: 'Global',
            type: 'system',
            enabled: true,
            condition: { level: 'critical' },
            notifyChannels: ['email'],
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ organizationId: undefined }))
    })

    it('should respect enabled false when explicitly set', async () => {
      const created = { id: 'rule-disabled', name: 'Paused', type: 'quota_warning', enabled: false }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Paused', type: 'quota_warning', enabled: false },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }))
    })

    it('should use template defaults for falsy condition and notifyChannels', async () => {
      const created = { id: 'rule-falsy-defaults', name: 'Minimal', type: 'custom', enabled: true }
      const chain = createInsertChain([created])
      mockInsert.mockReturnValue(chain)

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: {
            name: 'Minimal',
            type: 'custom',
            condition: null,
            notifyChannels: null,
          },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: { templateId: 'quota_90', threshold: 90 },
          notifyChannels: ['in_app', 'email'],
        }),
      )
    })

    it('should return responseError when db throws', async () => {
      mockInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Database unavailable')),
        }),
      })

      const response = await alertRulePostHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          body: { name: 'Fail', type: 'quota_warning' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect((response.data as Error).message).toBe('Database unavailable')
    })
  })
})
