import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import forcePasswordChangeHandler from '../me/force-password-change.post'
import passwordStateHandler from '../me/password-state.get'
import { createMockEvent } from './nitro-test-utils'

const mockSelect = vi.fn()
const mockUpdate = vi.fn()
const mockHashPassword = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  account: {
    id: 'accountId',
    userId: 'accountUserId',
    providerId: 'providerId',
    password: 'password',
    updatedAt: 'accountUpdatedAt',
  },
  user: {
    id: 'id',
    mustChangePassword: 'mustChangePassword',
    updatedAt: 'updatedAt',
  },
}))

vi.mock('better-auth/crypto', () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}))

function createSelectChain(result: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(result),
    }),
  }
}

function createUpdateReturningChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result)
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  return { set, where, returning }
}

describe('aigate password change handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHashPassword.mockResolvedValue('hashed-password')
  })

  it('should return current password state', async () => {
    mockSelect.mockReturnValueOnce(createSelectChain([{ mustChangePassword: true }]))

    const response = await passwordStateHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({ mustChangePassword: true })
  })

  it('should update credential password and clear must-change flag', async () => {
    const accountUpdate = createUpdateReturningChain([{ id: 'account-1' }])
    const userUpdate = createUpdateReturningChain([{ id: 'user-1' }])
    mockSelect.mockReturnValueOnce(createSelectChain([{ id: 'user-1', mustChangePassword: true }]))
    mockUpdate
      .mockReturnValueOnce(accountUpdate)
      .mockReturnValueOnce(userUpdate)

    const response = await forcePasswordChangeHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        body: { newPassword: 'new-password' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual({ ok: true })
    expect(mockHashPassword).toHaveBeenCalledWith('new-password')
    expect(accountUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ password: 'hashed-password' }))
    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })

  it('should reject when account is not marked for password change', async () => {
    mockSelect.mockReturnValueOnce(createSelectChain([{ id: 'user-1', mustChangePassword: false }]))

    const response = await forcePasswordChangeHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        body: { newPassword: 'new-password' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should reject when current account has no credential password', async () => {
    mockSelect.mockReturnValueOnce(createSelectChain([{ id: 'user-1', mustChangePassword: true }]))
    mockUpdate.mockReturnValueOnce(createUpdateReturningChain([]))

    const response = await forcePasswordChangeHandler(
      createMockEvent({
        context: { principal: { userId: 'user-1' } },
        body: { newPassword: 'new-password' },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.BAD_REQUEST)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })
})
