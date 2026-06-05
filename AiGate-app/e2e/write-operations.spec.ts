import { expect, test } from '@playwright/test'
import { authenticatedRequest } from './fixtures/api'
import { loginAsTestUser } from './fixtures/auth'

test.describe.configure({ mode: 'serial' })
test.setTimeout(60_000)

test.describe('E2E write operations', () => {
  test('create agent via API, verify in list, then cleanup', async ({ page, request }) => {
    const loggedIn = await loginAsTestUser(page)
    expect(loggedIn).toBeTruthy()

    const api = await authenticatedRequest(page, request)
    const agentName = `e2e-agent-${Date.now()}`

    const createResponse = await api.post('/api/aigate/agent', {
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
      const deleteResponse = await api.del(`/api/aigate/agent/${agentId}`)
      expect(deleteResponse.status()).toBeLessThan(500)
      expect(deleteResponse.status()).not.toBe(401)

      const deleteBody = await deleteResponse.json()
      expect(deleteBody).toHaveProperty('code', 200)
    }
  })

  test('create prompt via API, verify in list, then cleanup', async ({ page, request }) => {
    const loggedIn = await loginAsTestUser(page)
    expect(loggedIn).toBeTruthy()

    const api = await authenticatedRequest(page, request)
    const promptName = `e2e-prompt-${Date.now()}`

    const createResponse = await api.post('/api/aigate/prompt', {
      data: {
        name: promptName,
        content: 'E2E test prompt content',
      },
    })

    expect(createResponse.status()).toBeLessThan(500)
    expect(createResponse.status()).not.toBe(401)

    const createBody = await createResponse.json()
    expect(createBody).toHaveProperty('code', 200)
    expect(createBody.data).toHaveProperty('id')

    const promptId = createBody.data.id as string

    try {
      const listResponse = await page.goto('/aigate/prompts', { waitUntil: 'domcontentloaded' })
      expect(listResponse?.status()).toBeLessThan(500)
      expect(page.url()).not.toMatch(/\/auth\/sign-in/)

      await expect(page.getByText(promptName)).toBeVisible({ timeout: 15_000 })
    }
    finally {
      const deleteResponse = await api.del(`/api/aigate/prompt/${promptId}`)
      expect(deleteResponse.status()).toBeLessThan(500)
      expect(deleteResponse.status()).not.toBe(401)

      const deleteBody = await deleteResponse.json()
      expect(deleteBody).toHaveProperty('code', 200)
    }
  })

  test('create api key via API, verify in list, then cleanup', async ({ page, request }) => {
    const loggedIn = await loginAsTestUser(page)
    expect(loggedIn).toBeTruthy()

    const api = await authenticatedRequest(page, request)
    const apiKeyName = `e2e-api-key-${Date.now()}`

    const createResponse = await api.post('/api/aigate/api-key', {
      data: { name: apiKeyName },
    })

    expect(createResponse.status()).toBeLessThan(500)
    expect(createResponse.status()).not.toBe(401)

    const createBody = await createResponse.json()
    expect(createBody).toHaveProperty('code', 200)
    expect(createBody.data).toHaveProperty('id')

    const apiKeyId = createBody.data.id as string

    try {
      const listResponse = await page.goto('/aigate/api-keys', { waitUntil: 'domcontentloaded' })
      expect(listResponse?.status()).toBeLessThan(500)
      expect(page.url()).not.toMatch(/\/auth\/sign-in/)

      await expect(page.getByText(apiKeyName)).toBeVisible({ timeout: 15_000 })
    }
    finally {
      const deleteResponse = await api.del(`/api/aigate/api-key/${apiKeyId}`)
      expect(deleteResponse.status()).toBeLessThan(500)
      expect(deleteResponse.status()).not.toBe(401)

      const deleteBody = await deleteResponse.json()
      expect(deleteBody).toHaveProperty('code', 200)
    }
  })
})
