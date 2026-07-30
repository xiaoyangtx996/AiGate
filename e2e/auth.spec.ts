import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

test.describe('Auth pages', () => {
  test('sign-in page shows login form fields', async ({ page }) => {
    const response = await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBeTruthy()
    await expect(page).toHaveURL(/\/auth\/sign-in/)

    await expect(page.locator('form input').first()).toBeVisible()
    await expect(page.locator('form input').nth(1)).toBeVisible()
    await expect(page.locator('form button, button[type="submit"]').first()).toBeVisible()
  })

  test('wrong password does not crash the sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('form input')
    await inputs.first().fill('wrong_user')
    await inputs.nth(1).fill('WrongPassword123!')
    await page.locator('form button, button[type="submit"]').first().click()

    await expect(page).toHaveURL(/\/auth\/sign-in/, { timeout: 10_000 })
    await expect(inputs.first()).toBeVisible()
    await expect(inputs.nth(1)).toBeVisible()
  })
})
