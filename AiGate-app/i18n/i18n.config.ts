import type { LocaleMessage } from '@intlify/core-base'
import { defaultLocaleMessages } from '../shared/i18n/default-messages'

const messages = defaultLocaleMessages as Record<string, LocaleMessage>
const zhMessages = messages['zh-CN'] ?? {}
const enMessages = messages.en ?? {}

export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhMessages,
    'zh': zhMessages,
    'en': enMessages,
  },
}))
