<script setup lang="ts">
import type { ButtonProps, PageCardProps } from '@nuxt/ui'
import pkg from '@@/package.json'

definePageMeta({
  pageTransition: false,
})

const config = useRuntimeConfig()
const { t } = useI18n()
const f = (key: string) => t(`pages.hub.overview.features.${key}`)

const features = computed<PageCardProps[]>(() => [
  {
    title: f('architecture.title'),
    description: f('architecture.description'),
    icon: 'i-heroicons-server-stack',
  },
  {
    title: f('auth.title'),
    description: f('auth.description'),
    icon: 'i-heroicons-lock-closed',
  },
  {
    title: f('theme.title'),
    description: f('theme.description'),
    icon: 'i-heroicons-paint-brush',
  },
  {
    title: f('menuI18n.title'),
    description: f('menuI18n.description'),
    icon: 'i-heroicons-language',
  },
])

const links = computed<ButtonProps[]>(() => [
  {
    label: 'Github',
    to: pkg.git?.url ?? 'https://github.com',
    target: '_blank',
    icon: 'simple-icons:github',
  },
  {
    label: t('pages.hub.overview.start'),
    to: '/',
    color: 'neutral',
    variant: 'subtle',
    trailingIcon: 'i-lucide-arrow-right',
  },
])
</script>

<template>
  <ClientOnly>
    <div class="space-y-6">
      <UPageHero
        :description="config.public.appDesc"
        :links="links"
        :ui="{ container: '!py-0' }"
      >
        <template #headline>
          <UBadge>v{{ pkg.version }}</UBadge>
        </template>
        <template #title>
          Better <span class="text-primary">Nuxt</span>
        </template>
      </UPageHero>
      <UPageSection :ui="{ container: '!py-0' }">
        <UContainer class="max-w-5xl">
          <UPageGrid :ui="{ base: 'lg:grid-cols-2' }">
            <UPageCard
              v-for="(feature, index) in features"
              :key="index"
              variant="soft"
              v-bind="feature"
            />
          </UPageGrid>
        </UContainer>
      </UPageSection>
    </div>
    <template #fallback>
      <div class="space-y-4 p-6">
        <USkeleton class="h-8 w-48" />
        <USkeleton class="h-24 w-full" />
        <div class="grid gap-4 lg:grid-cols-2">
          <USkeleton v-for="i in 4" :key="i" class="h-32" />
        </div>
      </div>
    </template>
  </ClientOnly>
</template>
