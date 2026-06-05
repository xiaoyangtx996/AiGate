import { defaultLocaleMessages } from '../shared/i18n/default-messages'

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': defaultLocaleMessages['zh-CN'],
    zh: defaultLocaleMessages['zh-CN'],
    en: defaultLocaleMessages.en,
  },
}))
