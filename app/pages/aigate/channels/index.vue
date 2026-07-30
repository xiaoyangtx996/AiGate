<script setup lang="ts">
import ChannelCreateDrawer from './components/ChannelCreateDrawer.vue'
import HeaderContent from './components/HeaderContent.vue'

const { getChannelList, updateChannel, delChannel, checkChannelHealth, getChannelPresets } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const { exportToCSV } = useExport()
const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.channels.${key}`, params ?? {})

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-channels',
  async () => {
    const res = await getChannelList({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const { data: presetsData } = await useAsyncData('aigate-channel-presets', async () => {
  const res = await getChannelPresets()
  return res.data ?? []
})

const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const presets = computed(() => presetsData.value ?? [])

const createOpen = ref(false)
const editOpen = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)
const healthChecking = ref(false)
const togglingId = ref<string | null>(null)

const form = reactive({
  name: '',
  vendor: '',
  vendorTag: '',
  endpoint: '',
  icon: '',
  status: 'enabled',
})

function handleAdd() {
  createOpen.value = true
}

function handleEdit(row: any) {
  editData.value = row
  form.name = row.name || ''
  form.vendor = row.vendor || ''
  form.vendorTag = row.vendorTag || ''
  form.endpoint = row.endpoint || ''
  form.icon = row.icon || ''
  form.status = row.status || 'enabled'
  editOpen.value = true
}

async function handleToggleStatus(item: { id: string, status: string }) {
  togglingId.value = item.id
  try {
    const next = item.status === 'enabled' ? 'disabled' : 'enabled'
    await updateChannel({ id: item.id, status: next })
    successToast()
    refresh()
  }
  finally {
    togglingId.value = null
  }
}

async function handleDelete(id: string) {
  await delChannel(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!editData.value?.id || !form.name || !form.vendorTag || !form.endpoint)
    return
  saveLoading.value = true
  try {
    const data = { ...form }
    await updateChannel({ ...data, id: editData.value.id })
    successToast()
    editOpen.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
}

const healthCheckResult = ref<any>(null)
const showHealthDetail = ref(false)

function hasHealthResults(
  data: unknown,
): data is { results: any[], total?: number, healthy?: number, unhealthy?: number } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { results?: unknown }).results)
}

async function handleHealthCheck(channelId?: string) {
  healthChecking.value = true
  try {
    const res = await checkChannelHealth(channelId)
    if (hasHealthResults(res.data)) {
      const healthy = res.data.results.filter((r: any) => r.healthy).length
      successToast(p('healthCheckDone', { healthy, total: res.data.results.length }))
      healthCheckResult.value = res.data
      showHealthDetail.value = true
    }
    else if (res.data) {
      successToast(
        res.data.healthy
          ? p('healthSingleOk', { name: res.data.name })
          : p('healthSingleFail', { name: res.data.name }),
      )
      healthCheckResult.value = { results: [res.data] }
      showHealthDetail.value = true
    }
    refresh()
  }
  finally {
    healthChecking.value = false
  }
}

const statusColor: Record<string, 'success' | 'neutral' | 'warning'> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, 'success' | 'warning' | 'error'> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'error',
}
const getStatusColor = (status: string) => statusColor[status] || 'neutral'
const getHealthColor = (health: string) => healthColor[health] || 'error'

function handleExport() {
  exportToCSV(
    list.value.map(item => ({
      name: item.name,
      vendor: item.vendor,
      endpoint: item.endpoint,
      status: item.status,
      health: item.health,
      qps: item.qps,
    })),
    'channels-export',
  )
}
</script>

<template>
  <div class="space-y-4">
    <HeaderContent
      v-model="keyword"
      :loading
      :health-checking
      :refresh="
        () => {
          page = 1
          refresh()
        }
      "
      :handle-add
      :handle-export
      :handle-health-check="() => handleHealthCheck()"
    />

    <TableSkeleton v-if="loading" :cols="7" />
    <EmptyState v-else-if="list.length === 0" icon="lucide:radio-tower" :title="$t('common.noData')">
      <template #action>
        <UButton v-permission="'ADD'" icon="lucide:plus" @click="handleAdd">
          {{ p('add') }}
        </UButton>
      </template>
    </EmptyState>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <UCard v-for="item in list" :key="item.id" class="hover:border-primary transition-colors">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <UIcon :name="item.icon || 'lucide:radio-tower'" class="size-5 text-primary" />
              <h3 class="font-bold truncate">
                {{ item.name }}
              </h3>
            </div>
            <p class="mt-1 text-sm text-muted truncate">
              {{ item.vendor }} · {{ item.vendorTag }}
            </p>
          </div>
          <div class="flex gap-1">
            <UBadge :color="getStatusColor(item.status)" variant="subtle" size="sm">
              {{ item.status }}
            </UBadge>
            <UBadge :color="getHealthColor(item.health)" variant="subtle" size="sm">
              {{ item.health }}
            </UBadge>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div class="rounded-md bg-muted p-2">
            <p class="text-xs text-muted">
              凭证
            </p>
            <p class="font-mono">
              {{ item.activeCredentialCount || 0 }}/{{ item.credentialCount || 0 }}
            </p>
          </div>
          <div class="rounded-md bg-muted p-2">
            <p class="text-xs text-muted">
              7 天调用
            </p>
            <p class="font-mono">
              {{ (item.calls7d || 0).toLocaleString() }}
            </p>
          </div>
          <div class="rounded-md bg-muted p-2">
            <p class="text-xs text-muted">
              {{ p('qps') }}
            </p>
            <p class="font-mono">
              {{ item.qps }}
            </p>
          </div>
          <div class="rounded-md bg-muted p-2">
            <p class="text-xs text-muted">
              {{ p('priority') }}
            </p>
            <p class="font-mono">
              {{ item.priority }}
            </p>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between text-sm">
          <span class="text-muted">{{ p('status') }}</span>
          <USwitch
            :model-value="item.status === 'enabled'"
            :loading="togglingId === item.id"
            @update:model-value="() => handleToggleStatus(item)"
          />
        </div>

        <p class="mt-4 truncate text-xs text-muted">
          {{ item.endpoint }}
        </p>

        <div class="mt-4 flex justify-end gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:eye" :to="`/aigate/channels/${item.id}`" />
          <UButton
            size="xs"
            variant="ghost"
            icon="lucide:heart-pulse"
            :loading="healthChecking"
            @click="handleHealthCheck(item.id)"
          />
          <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(item)" />
          <UButton
            v-permission="'DELETE'"
            size="xs"
            variant="ghost"
            color="error"
            icon="lucide:trash-2"
            @click="handleDelete(item.id)"
          />
        </div>
      </UCard>
    </div>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>

    <UModal v-model:open="showHealthDetail">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ p('healthDetailTitle') }}
        </h3>
      </template>
      <template #body>
        <div v-if="healthCheckResult" class="space-y-4">
          <div v-if="healthCheckResult.total !== undefined" class="text-sm text-muted">
            {{
              p('healthSummary', {
                total: healthCheckResult.total,
                healthy: healthCheckResult.healthy,
                unhealthy: healthCheckResult.unhealthy,
              })
            }}
          </div>
          <div class="space-y-2">
            <div
              v-for="result in healthCheckResult.results || [healthCheckResult]"
              :key="result.channelId"
              class="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">
                  {{ result.name || '-' }}
                </div>
                <UBadge :color="result.healthy ? 'success' : 'error'" variant="subtle">
                  {{ result.healthy ? p('healthy') : p('unhealthy') }}
                </UBadge>
              </div>
              <div class="text-sm space-y-1 text-muted">
                <div class="flex justify-between">
                  <span>{{ p('latency') }}:</span>
                  <span class="font-mono">{{ result.latency }}ms</span>
                </div>
                <div v-if="result.status" class="flex justify-between">
                  <span>{{ p('statusCode') }}:</span>
                  <span class="font-mono">{{ result.status }}</span>
                </div>
                <div v-if="result.error" class="flex justify-between">
                  <span>{{ p('error') }}:</span>
                  <span class="text-error text-xs break-all">{{ result.error }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span>{{ p('timestamp') }}:</span>
                  <span>{{ result.timestamp }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton variant="ghost" @click="showHealthDetail = false">
            {{ p('close') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <ChannelCreateDrawer v-model:open="createOpen" :presets="presets" @success="refresh" />

    <UModal v-model:open="editOpen">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ $t('common.save') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('vendor')">
            <USelect
              v-model="form.vendor"
              :items="[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Anthropic', value: 'anthropic' },
                { label: 'DeepSeek', value: 'deepseek' },
                { label: p('other'), value: 'other' },
              ]"
              :placeholder="p('vendorPlaceholder')"
            />
          </UFormField>
          <UFormField label="Vendor Tag" required>
            <UInput v-model="form.vendorTag" placeholder="openai-compatible" />
          </UFormField>
          <UFormField label="Icon">
            <UInput v-model="form.icon" placeholder="lucide:radio-tower" />
          </UFormField>
          <UFormField :label="p('endpoint')" required>
            <UInput v-model="form.endpoint" :placeholder="p('endpointPlaceholder')" />
          </UFormField>
          <UFormField :label="p('status')">
            <USelect
              v-model="form.status"
              :items="[
                { label: p('enabled'), value: 'enabled' },
                { label: p('disabled'), value: 'disabled' },
              ]"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="editOpen = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saveLoading" :disabled="!form.name || !form.vendorTag || !form.endpoint" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
