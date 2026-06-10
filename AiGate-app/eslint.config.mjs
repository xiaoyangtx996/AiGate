import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '.nuxt',
    '.output',
    'coverage',
    'test-results',
    'node_modules',
    'app/db/migrations/meta/*.json',
    'scripts/*-result*.txt',
    '*.log',
  ],
  vue: true,
  typescript: true,
  stylistic: true,
  tailwindcss: true,
  rules: {
    'n/prefer-global/process': 'off',
  },
})
