import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
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
      ],
      exclude: [
        'server/**/__tests__/**',
        'server/**/*.d.ts',
      ],
      thresholds: {
        lines: 4,
        functions: 10,
        branches: 10,
        statements: 4,
      },
    },
  },
})
