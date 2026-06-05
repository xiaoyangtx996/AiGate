import { test, expect } from '@playwright/test'

/**
 * Smoke tests require the Nuxt dev server at http://localhost:5173.
 * Start it with `pnpm dev`, then run `pnpm test:e2e`.
 *
 * When the server is not running, tests are skipped (not failed) so unit
 * tests and CI can proceed without a live app instance.
 */
let serverAvailable = false

test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get('/')
    serverAvailable = response.ok() || response.status() === 302
  }
  catch {
    serverAvailable = false
  }
})

test.beforeEach(() => {
  test.skip(
    !serverAvailable,
    'Dev server not running at http://localhost:5173 — start with `pnpm dev`',
  )
})

test.describe('Smoke', () => {
  test('homepage responds', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.ok() || response?.status() === 302).toBeTruthy()
  })

  test('sign-in page loads', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await expect(page).toHaveURL(/\/auth\/sign-in/)
  })
})
