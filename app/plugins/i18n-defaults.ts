import type { Composer } from 'vue-i18n'
import { defaultLocaleMessages } from '~~/shared/i18n/default-messages'

type I18nComposer = Pick<Composer, 'mergeLocaleMessage'>

export default defineNuxtPlugin({
  name: 'i18n-defaults',
  enforce: 'pre',
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n as I18nComposer | undefined
    if (!i18n?.mergeLocaleMessage) {
      return
    }

    i18n.mergeLocaleMessage('zh-CN', defaultLocaleMessages['zh-CN'])
    i18n.mergeLocaleMessage('zh', defaultLocaleMessages['zh-CN'])
    i18n.mergeLocaleMessage('en', defaultLocaleMessages.en)
  },
})
