import { defineConfig } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    // Use a static asset for readiness; homepage may return 500 before DB is ready.
    url: 'http://localhost:5173/favicon.ico',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aigate',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'ci-e2e-secret-min-32-chars-long',
    },
  },
})
