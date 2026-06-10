<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import pkg from '~~/package.json'
import { getColor } from '@/utils/constants'

defineProps<{
  collapsed?: boolean
}>()

// 获取登录用户信息
const { userName, email, avatar, isPending } = useCurrentUser()
// 获取多会话信息
const { sessionItems } = await useSessionMenu()
// 用户操作
const confirm = useConfirmDialog()
const { i18nAuth, i18nCommon } = useMessage()
const router = useRouter()

const { $authClient } = useNuxtApp()
const lastMethod = $authClient.getLastUsedLoginMethod()

const { themeItems } = useThemeMenu()

function getThemeChip(item: DropdownMenuItem) {
  return typeof (item as { chip?: unknown }).chip === 'string' ? (item as { chip: string }).chip : ''
}

function getThemeSlot(item: DropdownMenuItem) {
  return typeof (item as { slot?: unknown }).slot === 'string' ? (item as { slot: string }).slot : ''
}

function getThemeIcon(item: DropdownMenuItem) {
  return typeof (item as { icon?: unknown }).icon === 'string' ? (item as { icon: string }).icon : undefined
}

const items = computed(
  () =>
    [
      [
        {
          type: 'label',
          label: userName.value,
          avatar: {
            src: avatar.value,
            alt: userName.value,
            loading: 'lazy',
          },
        },
      ],
      themeItems.value,
      [
        {
          label: $t('layout.github'),
          icon: 'simple-icons:github',
          to: pkg.git?.url ?? 'https://github.com',
          target: '_blank',
        },
        {
          label: $t('layout.blog'),
          icon: 'i-lucide-house',
          to: 'https://baiwumm.com',
          target: '_blank',
        },
      ],
      [
        {
          label: $t('layout.lastMethod'),
          icon: 'lucide:key-round',
          kbds: lastMethod ? [lastMethod] : undefined,
        },
        {
          label: $t('layout.switchAccount'),
          icon: 'lucide:users',
          children: sessionItems.value,
        },
        {
          label: $t('auth.logout.title'),
          icon: 'i-lucide-log-out',
          color: 'error',
          onSelect: async () => {
            await confirm({
              title: i18nAuth('logout.confirmTitle'),
              description: i18nAuth('logout.confirmDescription'),
              confirmLabel: i18nCommon('confirm'),
              loadingLabel: i18nAuth('waitLogout'),
              onConfirm: async () => {
                await $authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push('/auth/sign-in')
                    },
                  },
                })
                return true
              },
            })
          },
        },
      ],
    ] satisfies DropdownMenuItem[][],
)
</script>

<template>
  <ClientOnly>
    <div v-if="isPending" class="flex justify-center w-full">
      <Spinner />
    </div>
    <UDropdownMenu
      v-else
      :items="items"
      arrow
      :content="{ align: 'center', collisionPadding: 12 }"
      :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        block
        :square="collapsed"
        class="data-[state=open]:bg-elevated"
        :ui="{
          trailingIcon: 'text-dimmed',
        }"
        :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
      >
        <UUser
          :name="collapsed ? undefined : userName"
          :description="collapsed || userName === email ? undefined : email"
          :avatar="{
            src: avatar,
            alt: userName,
            loading: 'lazy',
          }"
          :chip="{
            color: 'success',
            position: 'bottom-right',
          }"
          :ui="{ wrapper: 'text-left' }"
        />
      </UButton>
      <template #item-leading="{ item }">
        <div class="inline-flex items-center justify-center shrink-0 size-5">
          <span
            v-if="getThemeSlot(item) === 'primary'"
            :class="
              cn('inline-block size-2 rounded-full', getThemeChip(item) === 'black' ? 'bg-black dark:bg-white' : '')
            "
            :style="{
              backgroundColor: getThemeChip(item) === 'black' ? undefined : getColor(getThemeChip(item), 500),
            }"
          />
          <span v-else-if="getThemeSlot(item) === 'locales'">{{ getThemeIcon(item) }}</span>
          <UIcon v-else-if="getThemeIcon(item)" :name="getThemeIcon(item)" />
        </div>
      </template>
    </UDropdownMenu>
  </ClientOnly>
</template>
