import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// 中文翻译
import zhCommon from '@/locales/zh/common.json'
import zhNav from '@/locales/zh/nav.json'

// 英文翻译
import enCommon from '@/locales/en/common.json'
import enNav from '@/locales/en/nav.json'

// 日文翻译
import jaCommon from '@/locales/ja/common.json'
import jaNav from '@/locales/ja/nav.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: {
        common: zhCommon,
        nav: zhNav,
      },
      en: {
        common: enCommon,
        nav: enNav,
      },
      ja: {
        common: jaCommon,
        nav: jaNav,
      },
    },
    fallbackLng: 'zh',
    ns: ['common', 'nav'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'aigate_language',
    },
  })

export default i18n
