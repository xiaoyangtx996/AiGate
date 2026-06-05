/*
 * @Author: 白雾茫茫丶<baiwumm.com>
 * @Date: 2026-03-19 11:10:04
 * @LastEditors: 白雾茫茫丶<baiwumm.com>
 * @LastEditTime: 2026-05-20 18:10:08
 * @Description: $fetch 请求封装
 */
import { defineNuxtPlugin, navigateTo, useCookie, useRuntimeConfig } from '#app'
import { RESPONSE_CODE } from '@/enums'

export default defineNuxtPlugin((nuxtApp) => {
  const { start, finish } = useLoadingIndicator()
  const config = useRuntimeConfig()
  const toast = useToast()

  const request = $fetch.create({
    baseURL: config.public.apiBase,
    timeout: 30 * 1000, // 超时时间，默认 30 秒
    // 请求拦截
    async onRequest({ options }) {
      start({ force: true })

      /**
       * 🔐 注入 token（BetterAuth）
       */
      const token = useCookie('better-auth.session-token').value

      if (token) {
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },

    // 响应成功
    async onResponse({ response }) {
      finish()

      // 统一响应数据
      const res = response._data as IResponse
      if (!isSuccess(res.code)) {
        toast.add({
          title: res.msg || '操作失败',
          color: 'error',
          icon: 'lucide:x',
        })
      }
    },

    // 响应错误
    async onResponseError({ response, error }) {
      finish()

      const res = response?._data as IResponse | undefined

      // 401 — 仅在有会话且非登录页时提示并跳转
      if (res?.code === RESPONSE_CODE.UNAUTHORIZED) {
        const token = useCookie('better-auth.session-token').value
        const path = import.meta.client ? window.location.pathname : ''
        const isAuthPage = path.startsWith('/auth')

        if (token && !isAuthPage) {
          toast.add({
            title: '登录已过期，请重新登录！',
            color: 'error',
          })
          await nuxtApp.runWithContext(() => navigateTo('/auth/sign-in'))
        }
        return
      }

      toast.add({
        title: catchError(error),
        color: 'error',
      })
    },
  })

  return {
    provide: {
      request,
    },
  }
})
