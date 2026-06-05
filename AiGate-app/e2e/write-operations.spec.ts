import { expect, test } from '@playwright/test'
import { loginAsTestUser } from './fixtures/auth'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

test.describe('E2E write operations', () => {
  test('create agent via API, verify in list, then cleanup', async ({ page, request }) => {
    const loggedIn = await loginAsTestUser(page)
    expect(loggedIn).toBeTruthy()

    const agentName = `e2e-agent-${Date.now()}`
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    const createResponse = await request.post('/api/aigate/agent', {
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      data: { name: agentName },
    })

    expect(createResponse.status()).toBeLessThan(500)
    expect(createResponse.status()).not.toBe(401)

    const createBody = await createResponse.json()
    expect(createBody).toHaveProperty('code', 200)
    expect(createBody.data).toHaveProperty('id')

    const agentId = createBody.data.id as string

    try {
      const listResponse = await page.goto('/aigate/agents', { waitUntil: 'domcontentloaded' })
      expect(listResponse?.status()).toBeLessThan(500)
      expect(page.url()).not.toMatch(/\/auth\/sign-in/)

      await expect(page.getByText(agentName)).toBeVisible({ timeout: 15_000 })
    }
    finally {
      const deleteResponse = await request.delete(`/api/aigate/agent/${agentId}`, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
      })
      expect(deleteResponse.status()).toBeLessThan(500)
      expect(deleteResponse.status()).not.toBe(401)

      const deleteBody = await deleteResponse.json()
      expect(deleteBody).toHaveProperty('code', 200)
    }
  })
})
