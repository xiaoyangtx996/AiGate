import { expect, test } from '@playwright/test'
import { loginAsTestUser } from './fixtures/auth'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

const PROTECTED_PAGES = [
  '/aigate/dashboard',
  '/aigate/agents',
  '/aigate/api-keys',
  '/aigate/prompts',
  '/aigate/channels',
  '/aigate/alerts',
]

test.describe('Authenticated business flows', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await loginAsTestUser(page)
    expect(loggedIn).toBeTruthy()
  })

  for (const path of PROTECTED_PAGES) {
    test(`${path} stays authenticated with page content`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
      expect(response?.status()).toBeLessThan(500)
      expect(page.url()).not.toMatch(/\/auth\/sign-in/)

      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(50)
    })
  }
})
