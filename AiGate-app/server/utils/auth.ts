import { betterAuth } from 'better-auth'
import { localization } from 'better-auth-localization'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, lastLoginMethod, magicLink, multiSession, username } from 'better-auth/plugins'
import { db } from '@/db/drizzle'
import * as schema from '@/db/schema'

const socialProviders: Record<string, { clientId: string, clientSecret: string }> = {}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  }
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders,
  plugins: [
    username(),
    magicLink({
      sendMagicLink: async ({ email: _email, url }) => {
        console.warn('Magic link:', url)
      },
    }),
    lastLoginMethod({ storeInDatabase: true }),
    multiSession(),
    localization({ defaultLocale: 'zh-Hans', fallbackLocale: 'default' }),
    admin({
      adminUserIds: process.env.BETTER_AUTH_ADMIN_USER_IDS ? process.env.BETTER_AUTH_ADMIN_USER_IDS.split(',') : [],
    }),
  ],
})
