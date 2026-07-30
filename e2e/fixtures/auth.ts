import type { Page } from '@playwright/test'
import pg from 'pg'

export const TEST_USERNAME = 'e2e_admin'
export const TEST_EMAIL = `${TEST_USERNAME}@aigate.local`
export const TEST_PASSWORD = 'Test123456'
export const TEST_NAME = 'E2E Admin'

const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const signInButtonPattern = /^登录$|^Sign in$/i

export interface EnsureTestUserResult {
  ok: boolean
  action: 'registered' | 'exists' | 'failed'
  status?: number
  body?: string
}

/** 通过 test-utils API 确保测试账号存在（幂等） */
export async function ensureTestUser(baseURL = DEFAULT_BASE_URL): Promise<EnsureTestUserResult> {
  const signInRes = await fetch(`${baseURL}/api/auth/sign-in/username`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseURL,
    },
    body: JSON.stringify({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    }),
  })

  if (signInRes.ok)
    return { ok: true, action: 'exists' }

  const res = await fetch(`${baseURL}/api/test-utils/ensure-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseURL,
    },
    body: JSON.stringify({
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      name: TEST_NAME,
    }),
  })

  const text = await res.text()
  if (res.ok)
    return { ok: true, action: 'registered' }

  return { ok: false, action: 'failed', status: res.status, body: text.slice(0, 300) }
}

/** 将 E2E 测试账号提升为 admin（API Key 等管理接口需要） */
export async function promoteTestUserAdmin(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString)
    return

  const client = new pg.Client({ connectionString })
  try {
    await client.connect()
    await client.query(`UPDATE "user" SET role = 'admin', updated_at = NOW() WHERE email = $1`, [TEST_EMAIL])
  }
  finally {
    await client.end()
  }
}

/** 在 Playwright page 上完成登录，返回是否离开 sign-in 页 */
export async function loginAsTestUser(page: Page): Promise<boolean> {
  await page.goto('/auth/sign-in', { waitUntil: 'networkidle', timeout: 60_000 })

  const usernameInput = page.locator('input[name="username"], input[autocomplete="username"]').first()
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()

  await usernameInput.waitFor({ state: 'visible', timeout: 15_000 })
  await usernameInput.fill(TEST_USERNAME)
  await passwordInput.fill(TEST_PASSWORD)
  await page.locator('form').first().getByRole('button', { name: signInButtonPattern }).click()

  await page.waitForURL(url => !url.pathname.includes('/auth/sign-in'), { timeout: 30_000 }).catch(() => {})
  await page.waitForTimeout(2000)

  return !page.url().includes('/auth/sign-in')
}
