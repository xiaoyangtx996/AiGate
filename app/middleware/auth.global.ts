/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-03-18 17:28:20
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-04-22 13:52:20
 * @Description: 认证鉴权
 */
type AuthSessionPayload = {
  user?: { id?: string } | null
} | null

type PasswordStatePayload = {
  data?: {
    mustChangePassword?: boolean
  }
} | null

export default defineNuxtRouteMiddleware(async (to) => {
  const isAuth = to.path.startsWith('/auth/')
  const isForcePasswordChange = to.path === '/auth/force-password-change'
  const isPublicDoc = to.path.startsWith('/docs/')

  let isLoggedIn = false

  if (import.meta.server) {
    const requestFetch = useRequestFetch()
    const session = await requestFetch<AuthSessionPayload>('/api/auth/get-session').catch(() => null)
    isLoggedIn = !!session?.user?.id
  }
  else {
    const { $authClient } = useNuxtApp()
    const session = $authClient.useSession()
    if (session.value?.isPending) {
      await new Promise<void>((resolve) => {
        const stop = watch(
          () => session.value?.isPending,
          (pending) => {
            if (!pending) {
              stop()
              resolve()
            }
          },
          { immediate: true },
        )
      })
    }
    isLoggedIn = !!session.value?.data?.user
  }

  if (!isLoggedIn && !isAuth && !isPublicDoc) {
    return navigateTo('/auth/sign-in')
  }

  if (isLoggedIn) {
    const mustChangePassword = import.meta.server
      ? await useRequestFetch()<PasswordStatePayload>('/api/aigate/me/password-state')
          .then(response => response?.data?.mustChangePassword === true)
          .catch(() => false)
      : await useAigateApi()
          .getPasswordState()
          .then(response => response.data?.mustChangePassword === true)
          .catch(() => false)

    if (mustChangePassword && !isForcePasswordChange) {
      return navigateTo('/auth/force-password-change')
    }

    if (!mustChangePassword && isForcePasswordChange) {
      return navigateTo('/aigate/my-workbench')
    }
  }

  if (isLoggedIn && ((isAuth && !isForcePasswordChange) || to.path === '/')) {
    return navigateTo('/aigate/my-workbench')
  }
})
