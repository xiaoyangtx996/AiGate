import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import alertPutHandler from '../alert/[id].put'
import alertRulePutHandler from '../alert/rule/[id].put'
import { createMockEvent } from './nitro-test-utils'

const { mockUpdate } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
}))

vi.mock('@/db/drizzle', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  alert: { id: 'id', organizationId: 'organizationId', read: 'read' },
  alertRule: {
    id: 'id',
    organizationId: 'organizationId',
    name: 'name',
    type: 'type',
    condition: 'condition',
    enabled: 'enabled',
    notifyChannels: 'notifyChannels',
  },
}))

function createUpdateChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result)
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  return { set, where, returning }
}

describe('aigate alert extended handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('alert [id].put (mark read)', () => {
    it('should return 404 when alert not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await alertPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should return 404 when alert belongs to another organization', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await alertPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'alert-other-org' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should mark alert as read scoped to organization', async () => {
      const updated = { id: 'alert-1', read: true, organizationId: 'org-1' }
      const chain = createUpdateChain([updated])
      mockUpdate.mockReturnValue(chain)

      const response = await alertPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'alert-1' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(chain.set).toHaveBeenCalledWith({ read: true })
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should mark alert as read without organization scoping', async () => {
      const updated = { id: 'alert-2', read: true, organizationId: null }
      const chain = createUpdateChain([updated])
      mockUpdate.mockReturnValue(chain)

      const response = await alertPutHandler(
        createMockEvent({
          params: { id: 'alert-2' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(chain.set).toHaveBeenCalledWith({ read: true })
    })

    it('should always set read to true regardless of request body', async () => {
      const updated = { id: 'alert-3', read: true }
      const chain = createUpdateChain([updated])
      mockUpdate.mockReturnValue(chain)

      await alertPutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'alert-3' },
          body: { read: false, title: 'ignored' },
        }),
      )

      expect(chain.set).toHaveBeenCalledWith({ read: true })
    })
  })

  describe('alert rule [id].put', () => {
    it('should return 404 when rule not found', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await alertRulePutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'missing' },
          body: { name: 'Updated rule' },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('规则不存在')
    })

    it('should return 404 when rule belongs to another organization', async () => {
      mockUpdate.mockReturnValue(createUpdateChain([]))

      const response = await alertRulePutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'rule-other-org' },
          body: { enabled: false },
        }),
      )

      expect(response.code).toBe(404)
      expect(response.msg).toBe('规则不存在')
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update rule scoped to organization', async () => {
      const updated = {
        id: 'rule-1',
        name: 'Quota 95%',
        type: 'quota_warning',
        enabled: true,
        organizationId: 'org-1',
      }
      const chain = createUpdateChain([updated])
      mockUpdate.mockReturnValue(chain)

      const body = { name: 'Quota 95%', enabled: true }
      const response = await alertRulePutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'rule-1' },
          body,
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(chain.set).toHaveBeenCalledWith(body)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('should update rule without organization scoping', async () => {
      const updated = { id: 'rule-2', name: 'Global alert', enabled: false }
      mockUpdate.mockReturnValue(createUpdateChain([updated]))

      const response = await alertRulePutHandler(
        createMockEvent({
          params: { id: 'rule-2' },
          body: { enabled: false },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
    })

    it('should apply batch fields from request body', async () => {
      const body = {
        name: 'Key expiry 14d',
        enabled: false,
        condition: { threshold: 14 },
        notifyChannels: ['email', 'in_app'],
      }
      const updated = { id: 'rule-3', type: 'key_expiring', ...body }
      const chain = createUpdateChain([updated])
      mockUpdate.mockReturnValue(chain)

      const response = await alertRulePutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'rule-3' },
          body,
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(updated)
      expect(chain.set).toHaveBeenCalledWith(body)
    })

    it('should pass empty body through to update set', async () => {
      const updated = { id: 'rule-4', name: 'Unchanged', enabled: true }
      const chain = createUpdateChain([updated])
      mockUpdate.mockReturnValue(chain)

      const response = await alertRulePutHandler(
        createMockEvent({
          context: { principal: { organizationId: 'org-1' } },
          params: { id: 'rule-4' },
        }),
      )

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(chain.set).toHaveBeenCalledWith({})
    })
  })
})
