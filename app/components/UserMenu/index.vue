<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import pkg from '~~/package.json'
import { getColor } from '@/utils/constants'

defineProps<{
  collapsed?: boolean
}>()

// 获取登录用户信息
const { userName, email, avatar, isPending } = useCurrentUser()
// 多会话菜单仅客户端加载，避免 SSR 请求 Better Auth 导致 hydration 不一致
const sessionItems = ref<DropdownMenuItem[]>([])
if (import.meta.client) {
  const { sessionItems: loadedSessionItems } = await useSessionMenu()
  watch(loadedSessionItems, value => {
    sessionItems.value = value ?? []
  }, { immediate: true })
}
// 用户操作
const confirm = useConfirmDialog()
const { i18nAuth, i18nCommon } = useMessage()
const router = useRouter()
const { getNotificationPrefs, saveNotificationPrefs } = useAigateApi()
const { successToast, errorToast } = useAppToast()

const { $authClient } = useNuxtApp()
const authSession = $authClient.useSession()
const lastMethod = $authClient.getLastUsedLoginMethod()
const profileOpen = ref(false)
const notificationOpen = ref(false)
const securityOpen = ref(false)
const profileLoading = ref(false)
const notificationLoading = ref(false)
const securityLoading = ref(false)
const sessionLoading = ref(false)
const securitySessions = ref<Array<{ token?: string, expiresAt?: string, ipAddress?: string, userAgent?: string }>>([])
const profileForm = reactive({
  displayName: '',
})
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
})
const notificationPrefs = reactive<Record<string, string[]>>({
  quota_warning: ['in_app', 'email'],
  tenant_expiring: ['in_app', 'email'],
  key_expiring: ['in_app', 'email'],
  error_spike: ['in_app'],
  rate_limit: ['in_app'],
  mcp_unavailable: ['in_app'],
  knowledge_storage: ['in_app'],
  agent_error: ['in_app'],
  channel_down: ['in_app'],
  credential_exhausted: ['in_app'],
  cost_spike: ['in_app'],
})
const alertTypes = Object.keys(notificationPrefs)

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

async function openNotifications() {
  notificationOpen.value = true
  notificationLoading.value = true
  try {
    const res = await getNotificationPrefs()
    for (const item of res.data || [])
      notificationPrefs[item.alertType] = item.channels
  }
  finally {
    notificationLoading.value = false
  }
}

function openProfile() {
  profileForm.displayName = userName.value || ''
  profileOpen.value = true
}

async function saveProfile() {
  profileLoading.value = true
  try {
    const client = $authClient as any
    const { error } = await client.updateUser({
      name: profileForm.displayName,
      displayUsername: profileForm.displayName,
    })
    if (error)
      return errorToast(error.message)
    await authSession.value?.refetch?.()
    successToast()
    profileOpen.value = false
  }
  finally {
    profileLoading.value = false
  }
}

async function saveNotifications() {
  notificationLoading.value = true
  try {
    await saveNotificationPrefs(alertTypes.map(alertType => ({ alertType, channels: notificationPrefs[alertType] || [] })))
    successToast()
    notificationOpen.value = false
  }
  finally {
    notificationLoading.value = false
  }
}

function toggleChannel(alertType: string, channel: string, checked: boolean) {
  const current = notificationPrefs[alertType] || []
  notificationPrefs[alertType] = checked ? [...new Set([...current, channel])] : current.filter(item => item !== channel)
}

async function changePassword() {
  securityLoading.value = true
  try {
    const client = $authClient as any
    const { error } = await client.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      revokeOtherSessions: true,
    })
    if (error)
      return errorToast(error.message)
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    successToast()
  }
  finally {
    securityLoading.value = false
  }
}

async function loadSecuritySessions() {
  sessionLoading.value = true
  try {
    const client = $authClient as any
    const res = await client.listSessions()
    securitySessions.value = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
  }
  finally {
    sessionLoading.value = false
  }
}

async function openSecurity() {
  securityOpen.value = true
  await loadSecuritySessions()
}

async function revokeOtherSessions() {
  securityLoading.value = true
  try {
    const client = $authClient as any
    const { error } = await client.revokeOtherSessions()
    if (error)
      return errorToast(error.message)
    successToast()
    await loadSecuritySessions()
  }
  finally {
    securityLoading.value = false
  }
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
          label: 'Profile',
          icon: 'lucide:user',
          onSelect: openProfile,
        },
        {
          label: 'My API Keys',
          icon: 'lucide:key',
          to: '/aigate/my-api-keys',
        },
        {
          label: 'My Usage',
          icon: 'lucide:chart-no-axes-column',
          to: '/aigate/my-workbench',
        },
        {
          label: 'Notification Preferences',
          icon: 'lucide:bell',
          onSelect: openNotifications,
        },
        {
          label: 'Security Settings',
          icon: 'lucide:shield',
          onSelect: openSecurity,
        },
      ],
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

    <USlideover v-model:open="profileOpen">
      <template #header>
        <h3 class="font-bold">
          Profile
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UUser :name="userName" :description="email" :avatar="{ src: avatar, alt: userName }" />
          <UFormField label="Display name">
            <UInput v-model="profileForm.displayName" />
          </UFormField>
          <UFormField label="Email">
            <UInput :model-value="email" disabled />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="profileOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="profileLoading" :disabled="!profileForm.displayName.trim()" @click="saveProfile">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover v-model:open="notificationOpen">
      <template #header>
        <h3 class="font-bold">
          Notification Preferences
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-for="alertType in alertTypes" :key="alertType" class="rounded-md border p-3">
            <p class="mb-2 font-mono text-sm">
              {{ alertType }}
            </p>
            <div class="flex gap-4">
              <UCheckbox
                label="In-app"
                :model-value="notificationPrefs[alertType]?.includes('in_app')"
                @update:model-value="value => toggleChannel(alertType, 'in_app', Boolean(value))"
              />
              <UCheckbox
                label="Email"
                :model-value="notificationPrefs[alertType]?.includes('email')"
                @update:model-value="value => toggleChannel(alertType, 'email', Boolean(value))"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="notificationOpen = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton :loading="notificationLoading" @click="saveNotifications">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>

    <USlideover v-model:open="securityOpen">
      <template #header>
        <h3 class="font-bold">
          Security Settings
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div class="rounded-md border border-default p-3">
            <div class="mb-3 flex items-center justify-between gap-2">
              <h4 class="text-sm font-medium">
                Active sessions
              </h4>
              <UButton size="xs" variant="ghost" icon="lucide:refresh-cw" :loading="sessionLoading" @click="loadSecuritySessions" />
            </div>
            <div class="space-y-2">
              <div
                v-for="session in securitySessions"
                :key="session.token || session.expiresAt"
                class="rounded-md bg-muted/40 p-2 text-xs"
              >
                <p class="truncate">
                  {{ session.userAgent || 'Unknown device' }}
                </p>
                <p class="text-muted">
                  {{ session.ipAddress || '-' }} · {{ session.expiresAt || '-' }}
                </p>
              </div>
              <p v-if="!securitySessions.length && !sessionLoading" class="text-xs text-muted">
                No active sessions
              </p>
            </div>
          </div>
          <UButton
            icon="lucide:log-out"
            variant="outline"
            :loading="securityLoading"
            @click="revokeOtherSessions"
          >
            Sign out other devices
          </UButton>
          <UFormField label="Current password">
            <UInput v-model="passwordForm.currentPassword" type="password" />
          </UFormField>
          <UFormField label="New password">
            <UInput v-model="passwordForm.newPassword" type="password" />
          </UFormField>
          <UButton
            icon="lucide:lock-keyhole"
            :loading="securityLoading"
            :disabled="!passwordForm.currentPassword || !passwordForm.newPassword"
            @click="changePassword"
          >
            Change password
          </UButton>
        </div>
      </template>
    </USlideover>
  </ClientOnly>
</template>
