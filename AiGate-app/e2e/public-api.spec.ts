import { expect, test } from '@playwright/test'
import { loginAsTestUser } from './fixtures/auth'

test.setTimeout(60_000)

/** 未登录访问受保护 API：期望 401；若走页面重定向则为 302 */
function expectUnauthorizedOrRedirect(status: number) {
  expect(status === 401 || status === 302).toBeTruthy()
}

test.describe('Public API access policy', () => {
  test('openapi endpoint is reachable or requires auth', async ({ request }) => {
    const response = await request.get('/api/openapi')
    const status = response.status()
    expect(status).toBeLessThan(500)

    if (status === 200) {
      expect(response.headers()['content-type']).toContain('application/json')
      const body = await response.json()
      expect(body).toHaveProperty('openapi')
      return
    }

    expectUnauthorizedOrRedirect(status)
  })

  test('search endpoint requires authentication', async ({ request }) => {
    const response = await request.get('/api/aigate/search?keyword=ab')
    expect(response.status()).toBeLessThan(500)
    expectUnauthorizedOrRedirect(response.status())
  })

  test('search endpoint rejects unauthenticated browser navigation', async ({ page }) => {
    const response = await page.goto('/api/aigate/search?keyword=ab', { waitUntil: 'domcontentloaded' })
    expect(response).not.toBeNull()
    const status = response?.status() ?? 0
    expect(status).toBeLessThan(500)

    const isApiDenied = status === 401 || status === 302 || status === 403
    const isRedirectToSignIn = /\/auth\/sign-in/.test(page.url())
    expect(isApiDenied || isRedirectToSignIn).toBeTruthy()
  })

  test('authenticated cookie request to agent API returns success', async ({ page, request }) => {
    const loggedIn = await loginAsTestUser(page)
    expect(loggedIn).toBeTruthy()

    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const response = await request.get('/api/aigate/agent', {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    })

    expect(response.status()).toBeLessThan(500)
    expect(response.status()).not.toBe(401)

    const body = await response.json()
    expect(body).toHaveProperty('code', 200)
    expect(body).toHaveProperty('data')
  })
})
