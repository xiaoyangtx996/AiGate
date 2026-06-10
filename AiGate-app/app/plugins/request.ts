import { defineNuxtPlugin, navigateTo, useCookie, useRuntimeConfig } from '#app'
import { getRequestErrorMessage, getResponseErrorMessage, isRequestErrorResponse, isUnauthorizedResponse, shouldRedirectUnauthorized } from '@/utils/request-error'

export default defineNuxtPlugin((nuxtApp) => {
  const { start, finish } = useLoadingIndicator()
  const config = useRuntimeConfig()
  const toast = useToast()

  const request = $fetch.create({
    baseURL: config.public.apiBase,
    timeout: 30 * 1000,
    async onRequest({ options }) {
      start({ force: true })

      const token = useCookie('better-auth.session-token').value
      if (token) {
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },

    async onResponse({ response }) {
      finish()

      const res = response._data as unknown
      if (isRequestErrorResponse(res)) {
        toast.add({
          title: getResponseErrorMessage(res, '操作失败'),
          color: 'error',
          icon: 'lucide:x',
        })
      }
    },

    async onResponseError({ response, error }) {
      finish()

      const res = response?._data as unknown
      if (isUnauthorizedResponse(res)) {
        const token = useCookie('better-auth.session-token').value
        const path = import.meta.client ? window.location.pathname : ''

        if (shouldRedirectUnauthorized(res, Boolean(token), path)) {
          toast.add({
            title: '登录已过期，请重新登录！',
            color: 'error',
          })
          await nuxtApp.runWithContext(() => navigateTo('/auth/sign-in'))
        }
        return
      }

      toast.add({
        title: getRequestErrorMessage(error, catchError(error)),
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
