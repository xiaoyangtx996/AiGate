import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import quotaDecisionPostHandler from '../quota/request/[id]/decision.post'
import quotaRequestListHandler from '../quota/request/index.get'
import quotaRequestPostHandler from '../quota/request/index.post'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockCreateOrganizationQuotaRequest = vi.fn()
const mockDecideOrganizationQuotaRequest = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  quotaRequest: {
    id: 'id',
    organizationId: 'organizationId',
    requesterId: 'requesterId',
    requestedTokenLimit: 'requestedTokenLimit',
    currentTokenLimit: 'currentTokenLimit',
    reason: 'reason',
    status: 'status',
    approverId: 'approverId',
    decisionComment: 'decisionComment',
    decidedAt: 'decidedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  organization: {
    id: 'id',
    name: 'name',
  },
  user: {
    id: 'id',
    name: 'name',
    email: 'email',
  },
}))

vi.mock('#server/utils/quota', () => ({
  createOrganizationQuotaRequest: (...args: unknown[]) => mockCreateOrganizationQuotaRequest(...args),
  decideOrganizationQuotaRequest: (...args: unknown[]) => mockDecideOrganizationQuotaRequest(...args),
}))

function createListChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(result),
          }),
        }),
      }),
    }),
  }
}

function createSelectWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

describe('aigate quota request handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list quota requests scoped to principal organization', async () => {
    const requests = [
      {
        id: 'req-1',
        organizationId: 'org-1',
        organizationName: 'Engineering',
        requesterId: 'user-1',
        requesterName: 'Alice',
        requesterEmail: 'alice@example.com',
        status: 'pending',
      },
    ]
    mockSelect.mockReturnValue(createListChain(requests))

    const response = await quotaRequestListHandler(
      createMockEvent({
        context: { principal: { organizationId: 'org-1', userId: 'user-1' } },
        query: { status: 'pending' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([{ ...requests[0], canDecide: false }])
  })

  it('should mark approvable quota requests for organization managers', async () => {
    const requests = [
      {
        id: 'req-1',
        organizationId: 'org-1',
        requesterId: 'user-1',
        status: 'pending',
      },
    ]
    mockSelect.mockReturnValue(createListChain(requests))

    const response = await quotaRequestListHandler(
      createMockEvent({
        context: { principal: { organizationId: 'org-1', userId: 'manager-1', role: 'manager', isAdmin: false } },
        query: { status: 'pending' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual([{ ...requests[0], canDecide: true }])
  })

  it('should reject unauthenticated quota request creation', async () => {
    const response = await quotaRequestPostHandler(
      createMockEvent({
        body: { organizationId: 'org-1', requestedTokenLimit: 100 },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.UNAUTHORIZED)
    expect(mockCreateOrganizationQuotaRequest).not.toHaveBeenCalled()
  })

  it('should reject cross-organization quota request creation', async () => {
    const response = await quotaRequestPostHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { organizationId: 'org-2', requestedTokenLimit: 100 },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockCreateOrganizationQuotaRequest).not.toHaveBeenCalled()
  })

  it('should create quota request for principal organization', async () => {
    const created = { id: 'req-1', organizationId: 'org-1', status: 'pending' }
    mockCreateOrganizationQuotaRequest.mockResolvedValue(created)

    const response = await quotaRequestPostHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1' } },
        body: { requestedTokenLimit: 1000, reason: 'Launch' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(created)
    expect(mockCreateOrganizationQuotaRequest).toHaveBeenCalledWith({
      organizationId: 'org-1',
      requestedTokenLimit: 1000,
      reason: 'Launch',
      requesterId: 'user-1',
    })
  })

  it('should reject ordinary user quota decisions', async () => {
    mockSelect.mockReturnValue(createSelectWhereChain([{ organizationId: 'org-1', requesterId: 'user-2' }]))

    const response = await quotaDecisionPostHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1', organizationId: 'org-1', role: 'user', isAdmin: false } },
        params: { id: 'req-1' },
        body: { status: 'approved' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockDecideOrganizationQuotaRequest).not.toHaveBeenCalled()
  })

  it('should reject manager self approvals', async () => {
    mockSelect.mockReturnValue(createSelectWhereChain([{ organizationId: 'org-1', requesterId: 'manager-1' }]))

    const response = await quotaDecisionPostHandler(
      createMockEvent({
        context: { principal: { userId: 'manager-1', organizationId: 'org-1', role: 'manager', isAdmin: false } },
        params: { id: 'req-1' },
        body: { status: 'approved' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(response.msg).toBe('无权审批该配额申请')
    expect(mockDecideOrganizationQuotaRequest).not.toHaveBeenCalled()
  })

  it('should submit admin quota decision', async () => {
    const updated = { id: 'req-1', status: 'approved' }
    mockSelect.mockReturnValue(createSelectWhereChain([{ organizationId: 'org-2', requesterId: 'user-1' }]))
    mockDecideOrganizationQuotaRequest.mockResolvedValue(updated)

    const response = await quotaDecisionPostHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'req-1' },
        body: { status: 'approved', comment: 'ok' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(updated)
    expect(mockDecideOrganizationQuotaRequest).toHaveBeenCalledWith({
      requestId: 'req-1',
      status: 'approved',
      approverId: 'admin-1',
      comment: 'ok',
    })
  })

  it('should submit manager quota decision within own organization', async () => {
    const updated = { id: 'req-1', status: 'approved' }
    mockSelect.mockReturnValue(createSelectWhereChain([{ organizationId: 'org-1', requesterId: 'user-1' }]))
    mockDecideOrganizationQuotaRequest.mockResolvedValue(updated)

    const response = await quotaDecisionPostHandler(
      createMockEvent({
        context: { principal: { userId: 'manager-1', organizationId: 'org-1', role: 'manager', isAdmin: false } },
        params: { id: 'req-1' },
        body: { status: 'approved', comment: 'ok' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(updated)
    expect(mockDecideOrganizationQuotaRequest).toHaveBeenCalledWith({
      requestId: 'req-1',
      status: 'approved',
      approverId: 'manager-1',
      comment: 'ok',
    })
  })
})
