import { betterAuth } from 'better-auth'
import { localization } from 'better-auth-localization'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, lastLoginMethod, multiSession, username } from 'better-auth/plugins'
import { db } from '@/db/drizzle'
import * as schema from '@/db/schema'

const authBaseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:5173'

export const auth = betterAuth({
  baseURL: authBaseUrl,
  trustedOrigins: [
    authBaseUrl,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    username(),
    lastLoginMethod({ storeInDatabase: true }),
    multiSession(),
    localization({ defaultLocale: 'zh-Hans', fallbackLocale: 'default' }),
    admin({
      adminUserIds: process.env.BETTER_AUTH_ADMIN_USER_IDS ? process.env.BETTER_AUTH_ADMIN_USER_IDS.split(',') : [],
    }),
  ],
})
