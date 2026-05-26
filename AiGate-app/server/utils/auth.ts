import { render } from '@vue-email/render'
import { betterAuth } from 'better-auth'
import { localization } from 'better-auth-localization'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, lastLoginMethod, magicLink, multiSession, username } from 'better-auth/plugins'
import { Resend } from 'resend'
import { db } from '@/db/drizzle'
import * as schema from '@/db/schema'

const resend = new Resend(process.env.NUXT_RESEND_API_KEY || 're_fake_key')

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  plugins: [
    username(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        console.log('Magic link:', url)
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
