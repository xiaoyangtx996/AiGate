import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '#server': path.resolve(rootDir, 'server'),
      '@': path.resolve(rootDir, 'app'),
      '~~': rootDir,
      '@@': rootDir,
    },
  },
  test: {
    setupFiles: ['server/api/aigate/__tests__/vitest.setup.ts'],
    include: [
      'server/**/__tests__/**/*.test.ts',
      'test/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
      include: [
        'server/utils/**/*.ts',
        'server/api/aigate/**/*.ts',
        'server/api/gateway/**/*.ts',
      ],
      exclude: [
        'server/**/__tests__/**',
        'server/**/*.d.ts',
      ],
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 45,
        statements: 65,
      },
    },
  },
})
