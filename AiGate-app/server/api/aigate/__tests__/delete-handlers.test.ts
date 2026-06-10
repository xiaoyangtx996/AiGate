import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import alertDeleteHandler from '../alert/[id].delete'

import alertRuleDeleteHandler from '../alert/rule/[id].delete'
import channelDeleteHandler from '../channel/[id].delete'
import promptDeleteHandler from '../prompt/[id].delete'
import { createMockEvent } from './nitro-test-utils'

const mockDelete = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  alert: { id: 'id', organizationId: 'organizationId' },
  alertRule: { id: 'id', organizationId: 'organizationId' },
  channel: { id: 'id', organizationId: 'organizationId' },
  prompt: { id: 'id', organizationId: 'organizationId' },
}))

function createDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate delete handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('alert [id].delete', () => {
    it('should return 404 when alert not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await alertDeleteHandler(createMockEvent({
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('资源不存在或无权操作')
    })

    it('should delete alert scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'alert-1' }]))

      const response = await alertDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'alert-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('channel [id].delete', () => {
    it('should reject non-admin principals', async () => {
      const response = await channelDeleteHandler(createMockEvent({
        context: { principal: { isAdmin: false, organizationId: 'org-1' } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should return 404 when channel not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await channelDeleteHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
    })

    it('should delete channel by id', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'ch-1' }]))

      const response = await channelDeleteHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'ch-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    })
  })

  describe('alert rule [id].delete', () => {
    it('should return 404 when rule not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await alertRuleDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('规则不存在')
    })

    it('should delete rule scoped to organization', async () => {
      const deleted = { id: 'rule-1', name: 'Quota alert' }
      mockDelete.mockReturnValue(createDeleteChain([deleted]))

      const response = await alertRuleDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'rule-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(deleted)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('prompt [id].delete', () => {
    it('should return 404 when prompt not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await promptDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
    })

    it('should delete prompt scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'prompt-1' }]))

      const response = await promptDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'prompt-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    })
  })
})
