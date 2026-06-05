/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-03-18 17:28:20
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-04-22 13:52:20
 * @Description: 认证鉴权
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { $authClient } = useNuxtApp()
  const relativeFetch = ((url: string, opts?: Record<string, unknown>) => {
    try {
      if (url.startsWith('http'))
        url = new URL(url).pathname
    }
    catch {}
    return useFetch(url, opts)
  }) as (url: string, opts?: Record<string, unknown>) => ReturnType<typeof useFetch>

  // 获取用户会话信息
  const { data: session } = await $authClient.useSession(relativeFetch)
  const isLoggedIn = !!session.value

  // 判断是否权限页面
  const isAuth = to.path.startsWith('/auth/')
  const isPublicDoc = to.path.startsWith('/docs/')

  // 未登录访问私有页面
  if (!isLoggedIn && !isAuth && !isPublicDoc) {
    return navigateTo('/auth/sign-in')
  }
})
