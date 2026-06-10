import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  checkQuota,
  consumeQuota,
  createOrganizationQuotaRequest,
  createQuotaRequest,
  decideOrganizationQuotaRequest,
  decideQuotaRequest,
  getQuotaStatus,
  validateQuotaConservation,
} from '../quota'

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  organization: {
    id: 'id',
    name: 'name',
    parentId: 'parentId',
    tokenLimit: 'tokenLimit',
    tokenUsed: 'tokenUsed',
  },
  quotaRequest: {
    id: 'id',
    organizationId: 'organizationId',
    status: 'status',
  },
  quotaChangeLog: {
    id: 'id',
    decisionStatus: 'decisionStatus',
  },
}))

function createSelectWhereChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  }
}

function createInsertChain(result: unknown[] = []) {
  return {
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateReturningChain(result: unknown[] = []) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('quota utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkQuota', () => {
    it('should reject when organization does not exist', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([]))

      const result = await checkQuota('missing-org', 100)

      expect(result).toEqual({ allowed: false, reason: '组织不存在' })
    })

    it('should allow unlimited usage when tokenLimit is zero', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 0, tokenUsed: 500 },
      ]))

      const result = await checkQuota('org-1', 1000)

      expect(result).toEqual({ allowed: true, remaining: Infinity })
    })

    it('should reject when quota is exhausted', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 1000 },
      ]))

      const result = await checkQuota('org-1', 10)

      expect(result).toEqual({ allowed: false, reason: '配额已用尽', remaining: 0 })
    })

    it('should reject when requested tokens exceed remaining', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 950 },
      ]))

      const result = await checkQuota('org-1', 100)

      expect(result).toEqual({
        allowed: false,
        reason: '配额不足，剩余 50 tokens',
        remaining: 50,
      })
    })

    it('should allow when sufficient quota remains', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 200 },
      ]))

      const result = await checkQuota('org-1', 100)

      expect(result).toEqual({ allowed: true, remaining: 800 })
    })
  })

  describe('consumeQuota', () => {
    it('should increment tokenUsed for organization', async () => {
      const where = vi.fn().mockResolvedValue(undefined)
      mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({ where }),
      })

      await consumeQuota('org-1', 150)

      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(where).toHaveBeenCalledTimes(1)
    })
  })

  describe('getQuotaStatus', () => {
    it('should return null when organization does not exist', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([]))

      const result = await getQuotaStatus('missing-org')

      expect(result).toBeNull()
    })

    it('should return warning and critical flags based on usage percent', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', name: 'Alpha', tokenLimit: 1000, tokenUsed: 960 },
      ]))

      const result = await getQuotaStatus('org-1')

      expect(result).toEqual({
        organizationId: 'org-1',
        organizationName: 'Alpha',
        tokenLimit: 1000,
        tokenUsed: 960,
        remaining: 40,
        usagePercent: 96,
        isWarning: true,
        isCritical: true,
      })
    })

    it('should return zero usage percent when tokenLimit is zero', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-2', name: 'Beta', tokenLimit: 0, tokenUsed: 500 },
      ]))

      const result = await getQuotaStatus('org-2')

      expect(result).toEqual({
        organizationId: 'org-2',
        organizationName: 'Beta',
        tokenLimit: 0,
        tokenUsed: 500,
        remaining: 0,
        usagePercent: 0,
        isWarning: false,
        isCritical: false,
      })
    })
  })

  describe('quota display helpers', () => {
    it('formatTokens should format correctly', () => {
      const formatTokens = (n: number) => {
        if (!n)
          return '0'
        return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
      }
      expect(formatTokens(0)).toBe('0')
      expect(formatTokens(500)).toBe('500')
      expect(formatTokens(1500)).toBe('2K')
      expect(formatTokens(1500000)).toBe('1.5M')
    })

    it('getQuotaColor should return correct color tier', () => {
      const getQuotaColor = (pct: number) => pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
      expect(getQuotaColor(50)).toBe('success')
      expect(getQuotaColor(80)).toBe('warning')
      expect(getQuotaColor(95)).toBe('error')
    })
  })

  describe('validateQuotaConservation', () => {
    const orgs = [
      { id: 'group', parentId: null, tokenLimit: 1000, tokenUsed: 100 },
      { id: 'company', parentId: 'group', tokenLimit: 600, tokenUsed: 50 },
      { id: 'department', parentId: 'company', tokenLimit: 300, tokenUsed: 20 },
      { id: 'team', parentId: 'department', tokenLimit: 100, tokenUsed: 10 },
    ]

    it('should allow quota changes that keep parent-child conservation', () => {
      const result = validateQuotaConservation(orgs, [
        { organizationId: 'department', nextTokenLimit: 350 },
        { organizationId: 'team', nextTokenLimit: 150 },
      ])

      expect(result).toEqual({ valid: true })
    })

    it('should reject when child quota exceeds parent quota', () => {
      const result = validateQuotaConservation([
        { id: 'parent', parentId: null, tokenLimit: 500 },
        { id: 'child', parentId: 'parent', tokenLimit: 600 },
      ])

      expect(result).toEqual({
        valid: false,
        reason: '子级配额不能超过父级配额',
        organizationId: 'child',
      })
    })

    it('should reject when child quota total exceeds parent quota', () => {
      const result = validateQuotaConservation([
        { id: 'parent', parentId: null, tokenLimit: 500 },
        { id: 'child-a', parentId: 'parent', tokenLimit: 300 },
        { id: 'child-b', parentId: 'parent', tokenLimit: 250 },
      ])

      expect(result).toEqual({
        valid: false,
        reason: '子级配额总和不能超过父级配额',
        organizationId: 'parent',
      })
    })

    it('should reject when quota is lower than used tokens', () => {
      const result = validateQuotaConservation(orgs, [
        { organizationId: 'company', nextTokenLimit: 40 },
      ])

      expect(result).toEqual({
        valid: false,
        reason: '配额不能小于已使用量',
        organizationId: 'company',
      })
    })
  })

  describe('quota request workflow helpers', () => {
    it('should create a pending quota request draft', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-09T08:00:00Z'))

      const result = createQuotaRequest({
        organizationId: 'org-1',
        requestedTokenLimit: 2000,
        reason: 'Project launch',
        requesterId: 'user-1',
      })

      expect(result).toEqual({
        valid: true,
        request: {
          organizationId: 'org-1',
          requestedTokenLimit: 2000,
          reason: 'Project launch',
          requesterId: 'user-1',
          status: 'pending',
          createdAt: new Date('2026-06-09T08:00:00Z'),
        },
      })

      vi.useRealTimers()
    })

    it('should reject invalid quota request drafts', () => {
      expect(createQuotaRequest({ organizationId: '', requestedTokenLimit: 100, requesterId: 'user-1' }))
        .toEqual({ valid: false, reason: '缺少组织' })
      expect(createQuotaRequest({ organizationId: 'org-1', requestedTokenLimit: -1, requesterId: 'user-1' }))
        .toEqual({ valid: false, reason: '申请配额必须是非负整数' })
    })

    it('should record approval decisions', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-09T09:00:00Z'))

      const result = decideQuotaRequest({
        requestId: 'req-1',
        status: 'approved',
        approverId: 'manager-1',
        comment: 'ok',
      })

      expect(result).toEqual({
        valid: true,
        decision: {
          requestId: 'req-1',
          status: 'approved',
          approverId: 'manager-1',
          comment: 'ok',
          decidedAt: new Date('2026-06-09T09:00:00Z'),
        },
      })

      vi.useRealTimers()
    })
  })

  describe('quota request persistence workflow', () => {
    it('should create quota request with current organization token limit', async () => {
      const created = { id: 'req-1', organizationId: 'org-1', currentTokenLimit: 1000 }
      mockSelect.mockReturnValue(createSelectWhereChain([
        { id: 'org-1', tokenLimit: 1000, tokenUsed: 100 },
      ]))
      mockInsert.mockReturnValue(createInsertChain([created]))

      const result = await createOrganizationQuotaRequest({
        organizationId: 'org-1',
        requestedTokenLimit: 2000,
        requesterId: 'user-1',
        reason: 'Need more capacity',
      })

      expect(result).toEqual(created)
      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should reject quota request when organization does not exist', async () => {
      mockSelect.mockReturnValue(createSelectWhereChain([]))

      try {
        await createOrganizationQuotaRequest({
          organizationId: 'missing-org',
          requestedTokenLimit: 100,
          requesterId: 'user-1',
        })
        throw new Error('expected createOrganizationQuotaRequest to reject')
      }
      catch (err) {
        expect(err).toMatchObject({ statusCode: 404 })
        expect((err as Error).message).toBe('组织不存在')
      }
    })

    it('should approve request, update quota and write change log', async () => {
      const request = {
        id: 'req-1',
        organizationId: 'org-1',
        requesterId: 'user-1',
        requestedTokenLimit: 800,
        currentTokenLimit: 500,
        reason: 'Launch',
        status: 'pending',
      }
      const orgs = [
        { id: 'org-1', parentId: null, tokenLimit: 500, tokenUsed: 100 },
      ]
      const updated = { ...request, status: 'approved', approverId: 'admin-1' }

      mockSelect
        .mockReturnValueOnce(createSelectWhereChain([request]))
        .mockReturnValueOnce({ from: vi.fn().mockResolvedValue(orgs) })
      mockUpdate
        .mockReturnValueOnce(createUpdateChain())
        .mockReturnValueOnce(createUpdateReturningChain([updated]))
      mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })

      const result = await decideOrganizationQuotaRequest({
        requestId: 'req-1',
        status: 'approved',
        approverId: 'admin-1',
        comment: 'ok',
      })

      expect(result).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(2)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockInsert.mock.results[0]?.value.values).toHaveBeenCalledWith({
        organizationId: 'org-1',
        requestId: 'req-1',
        actorId: 'admin-1',
        previousTokenLimit: 500,
        nextTokenLimit: 800,
        decisionStatus: 'approved',
        reason: 'ok',
      })
    })

    it('should reject request and write decision audit without changing quota', async () => {
      const request = {
        id: 'req-2',
        organizationId: 'org-1',
        requesterId: 'user-1',
        requestedTokenLimit: 800,
        currentTokenLimit: 500,
        reason: 'Launch',
        status: 'pending',
      }
      const updated = { ...request, status: 'rejected', approverId: 'manager-1' }

      mockSelect.mockReturnValueOnce(createSelectWhereChain([request]))
      mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
      mockUpdate.mockReturnValueOnce(createUpdateReturningChain([updated]))

      const result = await decideOrganizationQuotaRequest({
        requestId: 'req-2',
        status: 'rejected',
        approverId: 'manager-1',
        comment: 'not enough context',
      })

      expect(result).toEqual(updated)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockInsert.mock.results[0]?.value.values).toHaveBeenCalledWith({
        organizationId: 'org-1',
        requestId: 'req-2',
        actorId: 'manager-1',
        previousTokenLimit: 500,
        nextTokenLimit: 500,
        decisionStatus: 'rejected',
        reason: 'not enough context',
      })
    })

    it('should reject approval when quota conservation fails', async () => {
      mockSelect
        .mockReturnValueOnce(createSelectWhereChain([{
          id: 'req-1',
          organizationId: 'child',
          requestedTokenLimit: 600,
          currentTokenLimit: 100,
          status: 'pending',
        }]))
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValue([
            { id: 'parent', parentId: null, tokenLimit: 500, tokenUsed: 0 },
            { id: 'child', parentId: 'parent', tokenLimit: 100, tokenUsed: 0 },
          ]),
        })

      try {
        await decideOrganizationQuotaRequest({
          requestId: 'req-1',
          status: 'approved',
          approverId: 'admin-1',
        })
        throw new Error('expected decideOrganizationQuotaRequest to reject')
      }
      catch (err) {
        expect(err).toMatchObject({ statusCode: 400 })
        expect((err as Error).message).toBe('子级配额不能超过父级配额')
      }

      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })
})
