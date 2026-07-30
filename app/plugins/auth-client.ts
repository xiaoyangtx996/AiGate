import {
  adminClient,
  lastLoginMethodClient,
  multiSessionClient,
  usernameClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const baseURL = import.meta.client
    ? window.location.origin
    : config.public.appDomain

  const authClient = createAuthClient({
    baseURL,
    plugins: [usernameClient(), lastLoginMethodClient(), multiSessionClient(), adminClient()],
  })
  return {
    provide: {
      authClient,
    },
  }
})
