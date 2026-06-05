import type { Page } from '@playwright/test'

export const TEST_EMAIL = 'test@aigate.local'
export const TEST_PASSWORD = 'Test123456'
export const TEST_NAME = 'Test Admin'

const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'

export interface EnsureTestUserResult {
  ok: boolean
  action: 'registered' | 'exists' | 'failed'
  status?: number
  body?: string
}

/** 通过 sign-up API 确保测试账号存在（幂等） */
export async function ensureTestUser(baseURL = DEFAULT_BASE_URL): Promise<EnsureTestUserResult> {
  const res = await fetch(`${baseURL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME,
      callbackURL: '/',
    }),
  })

  const text = await res.text()
  if (res.ok) {
    return { ok: true, action: 'registered' }
  }
  if (text.includes('already') || text.includes('exists') || res.status === 422) {
    return { ok: true, action: 'exists' }
  }
  return { ok: false, action: 'failed', status: res.status, body: text.slice(0, 300) }
}

/** 在 Playwright page 上完成登录，返回是否离开 sign-in 页 */
export async function loginAsTestUser(page: Page): Promise<boolean> {
  await page.goto('/auth/sign-in', { waitUntil: 'networkidle', timeout: 60_000 })

  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

  await emailInput.waitFor({ state: 'visible', timeout: 15_000 })
  await emailInput.fill(TEST_EMAIL)
  await passwordInput.fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /登录|Sign in/i }).click()

  await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'), { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(2000)

  return !page.url().includes('/auth/sign-in')
}
