import { defineNuxtPlugin, navigateTo, useCookie, useRuntimeConfig } from '#app'
import {
  getRequestErrorMessage,
  getResponseErrorMessage,
  getTenantBlockCode,
  isRequestErrorResponse,
  isUnauthorizedResponse,
  shouldRedirectUnauthorized,
} from '@/utils/request-error'

function createResponseError(response: unknown) {
  const error = new Error(getResponseErrorMessage(response, 'Operation failed'))
  if (typeof response === 'object' && response !== null) {
    Object.assign(error, {
      code: (response as { code?: unknown }).code,
      response,
    })
  }
  return error
}

const SESSION_COOKIE = 'better-auth.session_token'

export default defineNuxtPlugin((nuxtApp) => {
  const { start, finish } = useLoadingIndicator()
  const config = useRuntimeConfig()
  const toast = useToast()

  const request = $fetch.create({
    baseURL: config.public.apiBase,
    timeout: 30 * 1000,
    async onRequest({ options }) {
      start({ force: true })

      if (import.meta.server) {
        const event = useRequestEvent()
        const cookie = event?.headers.get('cookie')
        if (cookie && !options.headers.has('cookie')) {
          options.headers.set('cookie', cookie)
        }
      }

      const token = useCookie(SESSION_COOKIE).value
      if (token) {
        options.headers.set('Authorization', `Bearer ${token}`)
      }
    },

    async onResponse({ response }) {
      finish()

      const res = response._data as unknown
      if (isRequestErrorResponse(res)) {
        const tenantBlockCode = getTenantBlockCode(res)
        if (tenantBlockCode) {
          await nuxtApp.runWithContext(() => navigateTo(`/tenant-blocked?code=${tenantBlockCode}`))
          throw createResponseError(res)
        }
        toast.add({
          title: getResponseErrorMessage(res, '操作失败'),
          color: 'error',
          icon: 'lucide:x',
        })
        throw createResponseError(res)
      }
    },

    async onResponseError({ response, error }) {
      finish()

      const res = response?._data as unknown
      const tenantBlockCode = getTenantBlockCode(res)
      if (tenantBlockCode) {
        await nuxtApp.runWithContext(() => navigateTo(`/tenant-blocked?code=${tenantBlockCode}`))
        return
      }
      if (isUnauthorizedResponse(res)) {
        const token = useCookie(SESSION_COOKIE).value
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
        title: getRequestErrorMessage(error, getResponseErrorMessage(res, 'Operation failed')),
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
