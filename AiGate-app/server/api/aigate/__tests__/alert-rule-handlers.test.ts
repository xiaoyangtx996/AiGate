import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockInsert = vi.fn()

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

import alertRuleListHandler from '../alert/rule/index.get'
import alertRulePostHandler from '../alert/rule/index.post'

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

      const response = await alertRuleListHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
      }))

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

      const response = await alertRulePostHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        body: {
          name: 'Key expiry',
          type: 'key_expiring',
          enabled: true,
          condition: { threshold: 7 },
          notifyChannels: ['in_app'],
        },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })
  })
})
