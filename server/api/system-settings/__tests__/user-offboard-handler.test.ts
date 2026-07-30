import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from '../../aigate/__tests__/nitro-test-utils'
import offboardHandler from '../user-manage/[id]/offboard.post'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockAuditLog = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  agent: { ownerId: 'ownerId' },
  apiKey: { userId: 'userId' },
  knowledgeBase: { ownerId: 'ownerId' },
  member: { userId: 'userId' },
  user: {
    id: 'id',
    username: 'username',
    email: 'email',
    banned: 'banned',
    banReason: 'banReason',
    banExpires: 'banExpires',
  },
}))

vi.mock('#server/utils/audit-log', () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateReturningChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

function createUpdateWhereChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function createDeleteReturningChain(result: unknown[]) {
  return {
    where: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('system settings user offboard handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject confirm text mismatch', async () => {
    mockSelect.mockReturnValueOnce(createSelectChain([{ id: 'user-1', username: 'alice', email: 'alice@example.com' }]))

    const response = await offboardHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'user-1' },
        body: { confirmText: 'wrong' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should ban, revoke keys, remove memberships and transfer owned resources', async () => {
    const userUpdate = createUpdateWhereChain()
    const keyUpdate = createUpdateReturningChain([{ id: 'key-1' }, { id: 'key-2' }])
    const agentUpdate = createUpdateReturningChain([{ id: 'agent-1' }])
    const kbUpdate = createUpdateReturningChain([{ id: 'kb-1' }, { id: 'kb-2' }])
    mockSelect
      .mockReturnValueOnce(createSelectChain([{ id: 'user-1', username: 'alice', email: 'alice@example.com' }]))
      .mockReturnValueOnce(createSelectChain([{ id: 'user-2', username: 'bob' }]))
      .mockReturnValueOnce(createSelectChain([{ id: 'user-1', username: 'alice', banned: true }]))
    mockUpdate
      .mockReturnValueOnce(userUpdate)
      .mockReturnValueOnce(keyUpdate)
      .mockReturnValueOnce(agentUpdate)
      .mockReturnValueOnce(kbUpdate)
    mockDelete.mockReturnValue(createDeleteReturningChain([{ id: 'member-1' }]))

    const response = await offboardHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'user-1' },
        body: {
          confirmText: 'alice',
          reason: 'left',
          transferAgents: true,
          transferKnowledgeBases: true,
          transferToUserId: 'user-2',
        },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data?.steps).toEqual([
      { key: 'banUser', ok: true, count: 1 },
      { key: 'revokeApiKeys', ok: true, count: 2 },
      { key: 'removeMembers', ok: true, count: 1 },
      { key: 'transferAgents', ok: true, count: 1 },
      { key: 'transferKnowledgeBases', ok: true, count: 2 },
    ])
    expect(agentUpdate.set).toHaveBeenCalledWith({ ownerId: 'user-2' })
    expect(kbUpdate.set).toHaveBeenCalledWith({ ownerId: 'user-2' })
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      'user.offboard',
      { type: 'user', id: 'user-1' },
      expect.anything(),
      expect.objectContaining({ steps: response.data?.steps }),
    )
  })
})
