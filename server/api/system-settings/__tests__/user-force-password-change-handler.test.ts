import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RESPONSE_CODE } from '@/enums'
import { createMockEvent } from '../../aigate/__tests__/nitro-test-utils'
import forcePasswordChangeHandler from '../user-manage/[id]/force-password-change.post'

const mockUpdate = vi.fn()

vi.mock('@/db/drizzle', () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/db/schema', () => ({
  user: {
    id: 'id',
    mustChangePassword: 'mustChangePassword',
    updatedAt: 'updatedAt',
  },
}))

function createUpdateReturningChain(result: unknown[]) {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(result),
      }),
    }),
  }
}

describe('system settings user force password change handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mark user must change password', async () => {
    const updated = { id: 'user-1', mustChangePassword: true }
    mockUpdate.mockReturnValueOnce(createUpdateReturningChain([updated]))

    const response = await forcePasswordChangeHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'user-1' },
        body: { mustChangePassword: true },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.SUCCESS)
    expect(response.data).toEqual(updated)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('should reject non-admin user', async () => {
    const response = await forcePasswordChangeHandler(
      createMockEvent({
        context: { principal: { userId: 'user-2', isAdmin: false } },
        params: { id: 'user-1' },
        body: { mustChangePassword: true },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.FORBIDDEN)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should return 404 when user does not exist', async () => {
    mockUpdate.mockReturnValueOnce(createUpdateReturningChain([]))

    const response = await forcePasswordChangeHandler(
      createMockEvent({
        context: { principal: { userId: 'admin-1', isAdmin: true } },
        params: { id: 'missing-user' },
        body: { mustChangePassword: true },
      }),
    )

    expect(response.code).toBe(RESPONSE_CODE.NOT_FOUND)
  })
})
