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
      const listResponse = await api.get(
        `/api/aigate/agent?page=1&pageSize=20&keyword=${encodeURIComponent(agentName)}`,
      )
      expect(listResponse.status()).toBeLessThan(500)
      const listBody = await listResponse.json()
      expect(listBody).toHaveProperty('code', 200)
      expect(listBody.data.items.some((a: { name: string }) => a.name === agentName)).toBe(true)
    } finally {
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
      const listResponse = await api.get(
        `/api/aigate/prompt?page=1&pageSize=20&keyword=${encodeURIComponent(promptName)}`,
      )
      expect(listResponse.status()).toBeLessThan(500)
      const listBody = await listResponse.json()
      expect(listBody).toHaveProperty('code', 200)
      expect(listBody.data.items.some((p: { name: string }) => p.name === promptName)).toBe(true)
    } finally {
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
      const listResponse = await api.get(
        `/api/aigate/api-key?page=1&pageSize=20&keyword=${encodeURIComponent(apiKeyName)}`,
      )
      expect(listResponse.status()).toBeLessThan(500)
      const listBody = await listResponse.json()
      expect(listBody).toHaveProperty('code', 200)
      expect(listBody.data.items.some((k: { name: string }) => k.name === apiKeyName)).toBe(true)
    } finally {
      const deleteResponse = await api.del(`/api/aigate/api-key/${apiKeyId}`)
      expect(deleteResponse.status()).toBeLessThan(500)
      expect(deleteResponse.status()).not.toBe(401)

      const deleteBody = await deleteResponse.json()
      expect(deleteBody).toHaveProperty('code', 200)
    }
  })
})
