<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'
import { merge } from 'es-toolkit'

const menuStore = useMenuStore()
const appStore = useAppStore()

const { locale, setLocaleMessage, getLocaleMessage } = useI18n()
const { getLocales } = useSystemApi()
const { data: localeRes } = useAsyncData('locales', () => getLocales(), { lazy: true })

watch(localeRes, (res) => {
  const code = res?.code
  if (!code || !isSuccess(code))
    return
  const data = res.data
  if (!data)
    return
  for (const key in data) {
    const localeKey = key as Locale
    setLocaleMessage(localeKey, merge(getLocaleMessage(localeKey), data[localeKey]))
  }
}, { immediate: true })

const localeMap = {
  'en': 'en',
  'zh-CN': 'zh_cn',
} as const

const uiLocale = computed(() => locales[localeMap[locale.value as keyof typeof localeMap] ?? 'zh_cn'])

const lang = computed(() => uiLocale.value.code)
const dir = computed(() => uiLocale.value.dir)

useHead({
  htmlAttrs: {
    lang,
    dir,
  },
})

useFaviconFromTheme()
</script>

<template>
  <UApp :locale="uiLocale" :toaster="{ position: 'top-center', duration: 2000 }">
    <UTheme
      :ui="{
        button: {
          base: 'cursor-pointer',
        },
      }"
    >
      <FullLoading />
      <UMain>
        <ClientOnly>
          <NuxtLoadingIndicator color="var(--ui-primary)" />
        </ClientOnly>
        <NuxtLayout>
          <NuxtPage
            :transition="{ name: appStore.transition }"
            :keepalive="{ include: menuStore.keepAliveList }"
          />
          <BackTop />
        </NuxtLayout>
      </UMain>
    </UTheme>
  </UApp>
</template>
