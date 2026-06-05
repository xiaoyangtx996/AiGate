import { ensureTestUser } from './fixtures/auth'

export default async function globalSetup() {
  const result = await ensureTestUser()
  if (!result.ok) {
    throw new Error(
      `E2E global setup: ensureTestUser failed (status=${result.status ?? 'unknown'}): ${result.body ?? ''}`,
    )
  }
}
