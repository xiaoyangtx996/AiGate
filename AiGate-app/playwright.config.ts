import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const rootDir = dirname(fileURLToPath(import.meta.url))

function loadDotEnv() {
  const envPath = resolve(rootDir, '.env')
  if (!existsSync(envPath))
    return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#'))
      continue
    const i = t.indexOf('=')
    if (i === -1)
      continue
    const key = t.slice(0, i).trim()
    const value = t.slice(i + 1).trim()
    if (!process.env[key])
      process.env[key] = value
  }
}

loadDotEnv()

export default defineConfig({
  testDir: './e2e',
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
    // favicon 过早就绪；轮询 /api/openapi 确保 Nitro 已启动
    url: 'http://localhost:5173/api/openapi',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/aigate',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'ci-e2e-secret-min-32-chars-long',
    },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
})
