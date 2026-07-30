<script setup lang="ts">
interface ChannelDetail {
  id: string
  name: string
  vendor: string
  vendorTag?: string | null
  endpoint: string
  status: string
  health: string
  priority?: number | null
  weight?: number | null
  qps?: number | null
  rateLimitQps?: number | null
  rateLimitTpm?: number | null
  rateLimitRpm?: number | null
  rateLimitStrategy?: string | null
  models?: string[] | null
}

interface ChannelTrendItem {
  time: string
  requests: number
  success: number
  avgLatency: number
}

interface ChannelStats {
  totalRequests: number
  successRate: string
  avgLatency: number
  trend: ChannelTrendItem[]
}

interface ChannelStatsResponse {
  data?: {
    channel: ChannelDetail
    stats: ChannelStats
  }
}

interface CredentialRecord {
  id: string
  name: string
  apiKeyMasked?: string
  status: string
  sort?: number
  cooldownUntil?: string | null
  lastCheckedAt?: string | null
  lastError?: string | null
}

const route = useRoute()
const router = useRouter()
const {
  delChannel,
  checkChannelHealth,
  updateChannel,
  getChannelCredentials,
  insertChannelCredential,
  updateChannelCredential,
  delChannelCredential,
  testChannel,
  syncChannelModels,
} = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const { i18nCommon } = useMessage()
const confirm = useConfirmDialog()
const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.channels.detail.${key}`, params ?? {})

const id = computed(() => String(route.params.id))
const activeTab = ref<'overview' | 'credentials' | 'models' | 'settings'>('overview')

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(`aigate-channel-${id.value}`, async () => {
  const res = await $fetch<ChannelStatsResponse>(`/api/aigate/channel/${id.value}/stats`)
  return res.data
})

const { data: credentialsData, refresh: refreshCredentials } = await useAsyncData(
  `aigate-channel-${id.value}-credentials`,
  async () => {
    const res = await getChannelCredentials(id.value)
    return res.data ?? []
  },
)

const channel = computed(() => data.value?.channel)
const credentials = computed<CredentialRecord[]>(() => (credentialsData.value || []) as CredentialRecord[])
const stats = computed<ChannelStats>(
  () =>
    data.value?.stats ?? {
      totalRequests: 0,
      successRate: '0%',
      avgLatency: 0,
      trend: [],
    },
)

const checking = ref(false)
const syncing = ref(false)
const testingCredentialId = ref<string | null>(null)
const credentialOpen = ref(false)
const credentialLoading = ref(false)
const editCredential = ref<CredentialRecord | null>(null)
const credentialForm = reactive({
  name: '',
  apiKey: '',
  status: 'active',
  sort: 0,
})
const settingsLoading = ref(false)
const settingsForm = reactive({
  name: '',
  vendor: '',
  vendorTag: '',
  endpoint: '',
  status: 'enabled',
  priority: 1,
  weight: 100,
  qps: 10,
})

watch(
  channel,
  (row) => {
    if (!row)
      return
    settingsForm.name = row.name || ''
    settingsForm.vendor = row.vendor || ''
    settingsForm.vendorTag = row.vendorTag || ''
    settingsForm.endpoint = row.endpoint || ''
    settingsForm.status = row.status || 'enabled'
    settingsForm.priority = row.priority ?? 1
    settingsForm.weight = row.weight ?? 100
    settingsForm.qps = row.qps ?? 10
  },
  { immediate: true },
)

const statusColor: Record<string, 'success' | 'neutral'> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, 'success' | 'warning' | 'error'> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'error',
}
const credentialStatusColor: Record<string, 'success' | 'neutral' | 'warning' | 'error'> = {
  active: 'success',
  disabled: 'neutral',
  exhausted: 'warning',
  error: 'error',
}
const tabs = [
  { key: 'overview', label: '概览', icon: 'lucide:layout-dashboard' },
  { key: 'credentials', label: '凭证', icon: 'lucide:key-round' },
  { key: 'models', label: '模型', icon: 'lucide:boxes' },
  { key: 'settings', label: '设置', icon: 'lucide:settings' },
] as const

async function refreshAll() {
  await Promise.all([refresh(), refreshCredentials()])
}

async function handleHealthCheck() {
  checking.value = true
  try {
    const res = await checkChannelHealth(id.value)
    successToast(
      res.data?.healthy
        ? p('healthSingleOk', { name: channel.value?.name || '-' })
        : p('healthSingleFail', { name: channel.value?.name || '-' }),
    )
    await refreshAll()
  }
  finally {
    checking.value = false
  }
}

async function handleDelete() {
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delChannel(id.value)
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    router.push('/aigate/channels')
  }
}

function resetCredential(row?: CredentialRecord) {
  editCredential.value = row ?? null
  credentialForm.name = row?.name ?? ''
  credentialForm.apiKey = ''
  credentialForm.status = row?.status ?? 'active'
  credentialForm.sort = row?.sort ?? credentials.value.length
}

function handleAddCredential() {
  resetCredential()
  credentialOpen.value = true
}

function handleEditCredential(row: CredentialRecord) {
  resetCredential(row)
  credentialOpen.value = true
}

async function handleSubmitCredential() {
  if (!credentialForm.name || (!editCredential.value && !credentialForm.apiKey))
    return
  credentialLoading.value = true
  try {
    const payload: Record<string, unknown> = {
      name: credentialForm.name,
      status: credentialForm.status,
      sort: credentialForm.sort,
    }
    if (credentialForm.apiKey)
      payload.apiKey = credentialForm.apiKey
    if (editCredential.value) {
      await updateChannelCredential({ ...payload, channelId: id.value, id: editCredential.value.id })
    }
    else {
      await insertChannelCredential(id.value, payload)
    }
    successToast()
    credentialOpen.value = false
    await refreshAll()
  }
  finally {
    credentialLoading.value = false
  }
}

async function handleDeleteCredential(row: CredentialRecord) {
  await delChannelCredential(id.value, row.id)
  successToast()
  await refreshAll()
}

async function handleTestCredential(row: CredentialRecord) {
  testingCredentialId.value = row.id
  try {
    const res = await testChannel(id.value, row.id)
    successToast(res.data?.healthy ? '凭证测试通过' : '凭证测试失败')
    await refreshAll()
  }
  finally {
    testingCredentialId.value = null
  }
}

async function handleSyncModels() {
  syncing.value = true
  try {
    const res = await syncChannelModels(id.value)
    successToast(`模型同步完成：${res.data?.total ?? 0} 个`)
    await refreshAll()
  }
  finally {
    syncing.value = false
  }
}

async function handleSaveSettings() {
  if (!settingsForm.name || !settingsForm.vendorTag || !settingsForm.endpoint)
    return
  settingsLoading.value = true
  try {
    await updateChannel({ ...settingsForm, id: id.value })
    successToast()
    await refresh()
  }
  finally {
    settingsLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/channels" />
        <div>
          <h2 class="text-xl font-bold">
            {{ p('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ channel?.name || '-' }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <UButton :loading="checking" icon="lucide:heart-pulse" variant="outline" @click="handleHealthCheck">
          {{ p('healthCheck') }}
        </UButton>
        <UButton v-permission="'DELETE'" icon="lucide:trash-2" color="error" variant="ghost" @click="handleDelete">
          {{ p('delete') }}
        </UButton>
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="4" :rows="4" />
    <EmptyState
      v-else-if="!channel"
      icon="lucide:radio-tower"
      :title="p('notFound')"
      :description="p('notFoundDesc')"
    />
    <template v-else>
      <div class="flex flex-wrap gap-2 border-b border-default pb-2">
        <UButton
          v-for="tab in tabs"
          :key="tab.key"
          :icon="tab.icon"
          :variant="activeTab === tab.key ? 'solid' : 'ghost'"
          size="sm"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </UButton>
      </div>

      <div v-if="activeTab === 'overview'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <UCard>
            <p class="text-sm text-muted">
              {{ p('totalRequests') }}
            </p>
            <p class="text-2xl font-bold">
              {{ stats.totalRequests || 0 }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              {{ p('successRate') }}
            </p>
            <p class="text-2xl font-bold text-success">
              {{ stats.successRate || '0%' }}
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              {{ p('avgLatency') }}
            </p>
            <p class="text-2xl font-bold">
              {{ stats.avgLatency || 0 }}ms
            </p>
          </UCard>
          <UCard>
            <p class="text-sm text-muted">
              {{ p('healthStatus') }}
            </p>
            <UBadge :color="healthColor[channel.health] || 'error'" variant="subtle">
              {{ channel.health }}
            </UBadge>
          </UCard>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UCard>
            <template #header>
              <h3 class="font-bold">
                {{ p('basicInfo') }}
              </h3>
            </template>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-muted">{{ $t('pages.aigate.channels.name') }}</span><span>{{ channel.name }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">{{ $t('pages.aigate.channels.vendor') }}</span><span>{{ channel.vendor }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">Vendor Tag</span><span>{{ channel.vendorTag }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">{{ $t('pages.aigate.channels.endpoint') }}</span>
                <code class="text-xs break-all text-right">{{ channel.endpoint }}</code>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">{{ $t('pages.aigate.channels.status') }}</span>
                <UBadge :color="statusColor[channel.status] || 'neutral'" variant="subtle">
                  {{ channel.status }}
                </UBadge>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">{{ p('priority') }}</span><span>{{ channel.priority }}</span>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-bold">
                {{ p('rateLimit') }}
              </h3>
            </template>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">{{ $t('pages.aigate.channels.qps') }}</span><span>{{ channel.qps }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">{{ p('rateLimitQps') }}</span><span>{{ channel.rateLimitQps }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">{{ p('rateLimitTpm') }}</span><span>{{ channel.rateLimitTpm }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">{{ p('rateLimitRpm') }}</span><span>{{ channel.rateLimitRpm }}</span>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UCard v-else-if="activeTab === 'credentials'">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">
              凭证池
            </h3>
            <UButton v-permission="'ADD'" size="sm" icon="lucide:plus" @click="handleAddCredential">
              新增凭证
            </UButton>
          </div>
        </template>
        <EmptyState v-if="credentials.length === 0" icon="lucide:key-round" title="暂无凭证" description="添加凭证后网关才能转发请求。" />
        <div v-else class="space-y-2">
          <div
            v-for="credential in credentials"
            :key="credential.id"
            class="flex flex-col gap-3 rounded-md border border-default p-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-medium">
                  {{ credential.name }}
                </p>
                <UBadge :color="credentialStatusColor[credential.status] || 'neutral'" variant="subtle">
                  {{ credential.status }}
                </UBadge>
              </div>
              <p class="mt-1 text-sm text-muted">
                {{ credential.apiKeyMasked || '****' }}
              </p>
              <p v-if="credential.lastError" class="mt-1 text-xs text-error break-all">
                {{ credential.lastError }}
              </p>
            </div>
            <div class="flex gap-1">
              <UButton
                size="xs"
                variant="ghost"
                icon="lucide:heart-pulse"
                :loading="testingCredentialId === credential.id"
                @click="handleTestCredential(credential)"
              />
              <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEditCredential(credential)" />
              <UButton
                v-permission="'DELETE'"
                size="xs"
                color="error"
                variant="ghost"
                icon="lucide:trash-2"
                @click="handleDeleteCredential(credential)"
              />
            </div>
          </div>
        </div>
      </UCard>

      <UCard v-else-if="activeTab === 'models'">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">
              {{ p('models') }}
            </h3>
            <UButton :loading="syncing" size="sm" icon="lucide:refresh-cw" @click="handleSyncModels">
              重新同步
            </UButton>
          </div>
        </template>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="model in channel.models || []" :key="model" variant="outline">
            {{ model }}
          </UBadge>
          <span v-if="!channel.models?.length" class="text-sm text-muted">{{ p('noModels') }}</span>
        </div>
      </UCard>

      <UCard v-else>
        <template #header>
          <h3 class="font-bold">
            渠道设置
          </h3>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="$t('pages.aigate.channels.name')" required>
            <UInput v-model="settingsForm.name" />
          </UFormField>
          <UFormField :label="$t('pages.aigate.channels.vendor')" required>
            <UInput v-model="settingsForm.vendor" />
          </UFormField>
          <UFormField label="Vendor Tag" required>
            <UInput v-model="settingsForm.vendorTag" />
          </UFormField>
          <UFormField :label="$t('pages.aigate.channels.endpoint')" required>
            <UInput v-model="settingsForm.endpoint" />
          </UFormField>
          <UFormField :label="$t('pages.aigate.channels.status')">
            <USelect
              v-model="settingsForm.status"
              :items="[
                { label: '启用', value: 'enabled' },
                { label: '禁用', value: 'disabled' },
              ]"
            />
          </UFormField>
          <UFormField :label="p('priority')">
            <UInput v-model.number="settingsForm.priority" type="number" />
          </UFormField>
          <UFormField :label="p('weight')">
            <UInput v-model.number="settingsForm.weight" type="number" />
          </UFormField>
          <UFormField :label="$t('pages.aigate.channels.qps')">
            <UInput v-model.number="settingsForm.qps" type="number" />
          </UFormField>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <UButton :loading="settingsLoading" @click="handleSaveSettings">
              {{ $t('common.save') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>

    <UModal v-model:open="credentialOpen">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ editCredential ? '编辑凭证' : '新增凭证' }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="credentialForm.name" placeholder="主账号 / 备用账号" />
          </UFormField>
          <UFormField label="API Key" :required="!editCredential">
            <UInput v-model="credentialForm.apiKey" type="password" placeholder="留空则不修改已有 Key" />
          </UFormField>
          <UFormField label="状态">
            <USelect
              v-model="credentialForm.status"
              :items="[
                { label: 'Active', value: 'active' },
                { label: 'Disabled', value: 'disabled' },
                { label: 'Exhausted', value: 'exhausted' },
                { label: 'Error', value: 'error' },
              ]"
            />
          </UFormField>
          <UFormField label="排序">
            <UInput v-model.number="credentialForm.sort" type="number" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="credentialOpen = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="credentialLoading" @click="handleSubmitCredential">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
