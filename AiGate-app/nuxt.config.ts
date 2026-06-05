import vue from '@vitejs/plugin-vue'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    env: process.env.NODE_ENV,
    githubToken: process.env.GITHUB_TOKEN,
    public: {
      apiBase: '/api',
      appName: process.env.NUXT_APP_NAME || 'AiGate',
      appDesc: process.env.NUXT_APP_DESC || 'Enterprise AI Management Platform',
      appDomain: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
      env: process.env.NODE_ENV,
    },
  },
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://cdn.baiwumm.com/fonts/MapleMono-CN-Regular/result.css',
        },
      ],
    },
  },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    'dayjs-nuxt',
    'nuxt-resend',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@vercel/analytics',
    'nuxt-qrcode',
    '@nuxtjs/mdc',
    '@norbiros/nuxt-auto-form',
    '@vercel/speed-insights',
    'nuxt-charts',
    'nuxt-easy-lightbox',
    '@nuxt/image',
  ],
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    baseUrl: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
    vueI18n: 'i18n.config.ts',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: false,
    },
    locales: [
      { code: 'en', name: 'English' },
      { code: 'zh-CN', name: '简体中文' },
    ],
  },
  experimental: {
    normalizePageNames: true,
  },
  vite: {
    optimizeDeps: {
      include: [
        'better-auth/client/plugins',
        'better-auth/vue',
        'clsx',
        'dayjs',
        'dayjs/plugin/relativeTime',
        'dayjs/plugin/updateLocale',
        'dayjs/plugin/utc',
        'enum-plus',
        'es-toolkit',
        'motion-v',
        'pinia-plugin-persistedstate',
        'tailwind-merge',
        'tailwindcss/colors',
        'zod',
      ],
    },
  },
  nitro: {
    compressPublicAssets: {
      brotli: true,
      gzip: true,
    },
    rollupConfig: {
      plugins: [vue()],
    },
    middleware: [
      '~/server/middleware/error-handler.ts',
    ],
  },
})
