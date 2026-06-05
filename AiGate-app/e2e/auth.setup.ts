import { expect, test as setup } from '@playwright/test'
import { ensureTestUser, promoteTestUserAdmin } from './fixtures/auth'

/** Nitro 在 favicon 就绪后可能仍未完成初始化，对 503 重试 */
async function ensureTestUserWhenReady(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await ensureTestUser()
    if (result.ok)
      return result
    if (result.status === 503) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
      continue
    }
    return result
  }
  return { ok: false, action: 'failed' as const, status: 503, body: 'server not ready' }
}

setup('ensure test user exists', async () => {
  const result = await ensureTestUserWhenReady()
  expect(result.ok, `ensureTestUser failed: ${result.status} ${result.body ?? ''}`).toBeTruthy()
  await promoteTestUserAdmin()
})
