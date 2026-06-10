import { expect, test } from '@playwright/test'

test.describe('Smoke', () => {
  test('homepage is reachable', async ({ page }) => {
    const response = await page.goto('/')
    expect(response).not.toBeNull()
    expect(response?.ok() || response?.status() === 302).toBeTruthy()
    await expect(page).toHaveURL(/\/(auth\/sign-in)?/)
  })

  test('sign-in page loads with auth form', async ({ page }) => {
    const response = await page.goto('/auth/sign-in')
    expect(response?.ok()).toBeTruthy()
    await expect(page).toHaveURL(/\/auth\/sign-in/)
    await expect(page.locator('form, input, button').first()).toBeVisible()
  })

  test('sign-in page has document title', async ({ page }) => {
    await page.goto('/auth/sign-in')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('openapi endpoint returns JSON spec', async ({ request }) => {
    const response = await request.get('/api/openapi')
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['content-type']).toContain('application/json')

    const body = await response.json()
    expect(body).toHaveProperty('openapi')
    expect(body).toHaveProperty('info')
    expect(body).toHaveProperty('paths')
  })

  test('hub overview redirects unauthenticated users to sign-in', async ({ page }) => {
    const response = await page.goto('/hub/overview')
    expect(response).not.toBeNull()
    expect(response?.status()).toBeLessThan(500)
    await expect(page).toHaveURL(/\/auth\/sign-in/)
  })

  test('api docs page is reachable', async ({ page }) => {
    const response = await page.goto('/docs/api')
    expect(response).not.toBeNull()
    const status = response?.status() ?? 0
    expect(status === 200 || status === 302).toBeTruthy()
    expect(status).toBeLessThan(500)
    await expect(page).toHaveURL(/\/docs\/api/)
  })
})
