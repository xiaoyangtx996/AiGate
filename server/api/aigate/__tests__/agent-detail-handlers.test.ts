import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import agentDeleteHandler from '../agent/[id].delete'
import agentGetHandler from '../agent/[id].get'
import agentConversationsHandler from '../agent/[id]/conversations.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockDelete = vi.fn()
const mockGetUserConversations = vi.fn()
const mockLoadAgentBindings = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: {
    id: 'id',
    name: 'name',
    organizationId: 'organizationId',
  },
}))

vi.mock('#server/utils/agent-chat', () => ({
  getUserConversations: (...args: unknown[]) => mockGetUserConversations(...args),
}))

vi.mock('#server/utils/agent-bindings', () => ({
  loadAgentBindings: (...args: unknown[]) => mockLoadAgentBindings(...args),
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createDeleteChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

const emptyBindings = {
  knowledgeBaseIds: [],
  toolIds: [],
  skillIds: [],
  knowledgeBases: [],
  tools: [],
  skills: [],
}

describe('aigate agent detail handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLoadAgentBindings.mockResolvedValue(emptyBindings)
  })

  describe('agent [id].get', () => {
    it('should return 404 when agent not found', async () => {
      mockSelect.mockReturnValue(createSelectChain([]))

      const response = await agentGetHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(response.msg).toBe('Agent not found')
      expect(mockSelect).toHaveBeenCalledTimes(1)
      expect(mockLoadAgentBindings).not.toHaveBeenCalled()
    })

    it('should return agent scoped to organization with bindings', async () => {
      const agent = { id: 'agent-1', name: 'Support Bot', organizationId: 'org-1' }
      mockSelect.mockReturnValue(createSelectChain([agent]))

      const response = await agentGetHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'agent-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ ...agent, ...emptyBindings })
      expect(mockSelect).toHaveBeenCalledTimes(1)
      expect(mockLoadAgentBindings).toHaveBeenCalledWith('agent-1')
    })

    it('should reject non-admin detail access without organization context', async () => {
      const response = await agentGetHandler(createMockEvent({
        params: { id: 'agent-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(response.msg).toBe('Missing organization context')
      expect(mockSelect).not.toHaveBeenCalled()
    })

    it('should allow admin to return agent without organization context', async () => {
      const agent = { id: 'agent-2', name: 'Global Bot' }
      mockSelect.mockReturnValue(createSelectChain([agent]))

      const response = await agentGetHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'agent-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual({ ...agent, ...emptyBindings })
    })
  })

  describe('agent [id].delete', () => {
    it('should return 404 when agent not found', async () => {
      mockDelete.mockReturnValue(createDeleteChain([]))

      const response = await agentDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'missing' },
      }))

      expect(response.code).toBe(404)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should delete agent scoped to organization', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'agent-1' }]))

      const response = await agentDeleteHandler(createMockEvent({
        context: { principal: { organizationId: 'org-1' } },
        params: { id: 'agent-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toBeNull()
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })

    it('should reject non-admin delete without organization context', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'agent-2' }]))

      const response = await agentDeleteHandler(createMockEvent({
        params: { id: 'agent-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('should allow admin to delete agent without organization context', async () => {
      mockDelete.mockReturnValue(createDeleteChain([{ id: 'agent-2' }]))

      const response = await agentDeleteHandler(createMockEvent({
        context: { principal: { isAdmin: true } },
        params: { id: 'agent-2' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(mockDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('agent [id]/conversations.get', () => {
    it('should return unauthorized when user is not logged in', async () => {
      const response = await agentConversationsHandler(createMockEvent({
        params: { id: 'agent-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
      expect(response.msg).toBe('Unauthorized')
      expect(mockGetUserConversations).not.toHaveBeenCalled()
    })

    it('should return conversations for user and agent', async () => {
      const conversations = [
        { id: 'conv-1', agentId: 'agent-1', title: 'Hello' },
        { id: 'conv-2', agentId: 'agent-1', title: 'Follow up' },
      ]
      mockGetUserConversations.mockResolvedValue(conversations)

      const response = await agentConversationsHandler(createMockEvent({
        context: { principal: { userId: 'user-1' } },
        params: { id: 'agent-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
      expect(response.data).toEqual(conversations)
      expect(mockGetUserConversations).toHaveBeenCalledWith('user-1', 'agent-1')
    })

    it('should propagate errors from getUserConversations', async () => {
      mockGetUserConversations.mockRejectedValue(new Error('Database unavailable'))

      const response = await agentConversationsHandler(createMockEvent({
        context: { principal: { userId: 'user-1' } },
        params: { id: 'agent-1' },
      }))

      expect(response.code).toBe(RESPONSE_CODE.SERVER_ERROR)
      expect(mockGetUserConversations).toHaveBeenCalledWith('user-1', 'agent-1')
    })
  })
})
