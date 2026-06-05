import { test, expect } from '@playwright/test'

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
})
