<script setup lang="ts">
type AlertStatus = 'open' | 'acknowledged' | 'resolved'

interface AlertRow {
  id: string
  title: string
  message: string
  type: string
  severity: string
  read: boolean
  status?: AlertStatus
  createdAt: string
}

const { getAlertList, updateAlertStatus, delAlert, runAlertCheck } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.alerts.${key}`)

const page = ref(1)
const pageSize = ref(20)
const activeCategory = ref('all')
const activeStatus = ref<'all' | AlertStatus>('open')

const categoryTabs = computed(() => [
  { label: p('categories.all'), value: 'all' },
  { label: p('categories.quota'), value: 'quota' },
  { label: p('categories.access'), value: 'access' },
  { label: p('categories.ai'), value: 'ai' },
  { label: p('categories.system'), value: 'system' },
])

const statusTabs = computed(() => [
  { label: p('statusTabs.open'), value: 'open' },
  { label: p('statusTabs.acknowledged'), value: 'acknowledged' },
  { label: p('statusTabs.resolved'), value: 'resolved' },
  { label: p('statusTabs.all'), value: 'all' },
])

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-alerts',
  async () => {
    const res = await getAlertList({
      page: page.value,
      pageSize: pageSize.value,
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
      status: activeStatus.value === 'all' ? undefined : activeStatus.value,
    })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize, activeCategory, activeStatus],
    dedupe: 'defer',
  },
)

watch([activeCategory, activeStatus], () => {
  page.value = 1
})

const list = computed(() => (data.value?.items ?? []) as AlertRow[])
const total = computed(() => data.value?.total ?? 0)
const getAlertStatus = (row: AlertRow): AlertStatus => row.status || (row.read ? 'acknowledged' : 'open')
const openCount = computed(() => list.value.filter(a => getAlertStatus(a) === 'open').length)
const checking = ref(false)

const { selectedCount, hasSelection, isSelected, toggleSelect, clearSelection, getSelectedItems, batchDelete }
  = useBatchOperations<AlertRow>({
    onDelete: async (items) => {
      await Promise.all(items.map(item => delAlert(item.id)))
      refresh()
    },
  })

async function handleStatus(id: string, status: AlertStatus) {
  await updateAlertStatus(id, status)
  refresh()
}

async function batchAcknowledge() {
  const items = getSelectedItems(list.value).filter(a => getAlertStatus(a) === 'open')
  if (items.length === 0)
    return
  await Promise.all(items.map(item => updateAlertStatus(item.id, 'acknowledged')))
  successToast()
  clearSelection()
  refresh()
}

async function handleCheckAlerts() {
  checking.value = true
  try {
    await runAlertCheck()
    successToast(p('checkDone'))
    page.value = 1
    refresh()
  }
  finally {
    checking.value = false
  }
}

const severityColor: Record<string, 'info' | 'warning' | 'error'> = {
  info: 'info',
  warning: 'warning',
  critical: 'error',
}
const severityIcon: Record<string, string> = {
  info: 'lucide:info',
  warning: 'lucide:alert-triangle',
  critical: 'lucide:alert-octagon',
}
const statusColor: Record<AlertStatus, 'warning' | 'info' | 'success'> = {
  open: 'warning',
  acknowledged: 'info',
  resolved: 'success',
}

const categoryLabels: Record<string, string> = {
  quota: p('categories.quota'),
  access: p('categories.access'),
  ai: p('categories.ai'),
  system: p('categories.system'),
}

const categoryByType: Record<string, string> = {
  quota_warning: 'quota',
  tenant_expiring: 'quota',
  key_expiring: 'quota',
  key_expired: 'quota',
  cost_spike: 'quota',
  channel_down: 'access',
  credential_exhausted: 'access',
  mcp_unavailable: 'access',
  knowledge_storage: 'ai',
  agent_error: 'ai',
  error_spike: 'ai',
  rate_limit: 'ai',
  system: 'system',
}

const typeLabel = (type: string) => t(`pages.aigate.alerts.types.${type}`, type)
const categoryLabel = (type: string) => categoryLabels[categoryByType[type] || 'system'] || p('categories.system')
const statusLabel = (status: AlertStatus) => p(`statusTabs.${status}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold">
          {{ p('title') }}
        </h2>
        <UBadge v-if="openCount > 0" color="error" variant="solid" size="sm">
          {{ openCount }} {{ p('open') }}
        </UBadge>
      </div>
      <div class="flex gap-2">
        <UButton :loading="checking" icon="lucide:refresh-cw" variant="outline" @click="handleCheckAlerts">
          {{ p('check') }}
        </UButton>
        <UButton icon="lucide:settings" variant="ghost" to="/aigate/alerts/rules">
          {{ p('rules') }}
        </UButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <UTabs v-model="activeCategory" :items="categoryTabs" />
      <UTabs v-model="activeStatus" :items="statusTabs" />
    </div>

    <TableSkeleton v-if="loading" :cols="1" :rows="4" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:check-circle"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <div v-else class="space-y-3">
      <UCard
        v-for="a in list"
        :key="a.id"
        :class="getAlertStatus(a) === 'open' ? 'border-l-4 border-l-warning' : getAlertStatus(a) === 'resolved' ? 'opacity-70' : ''"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div class="flex min-w-0 flex-1 items-start gap-3">
            <UCheckbox :model-value="isSelected(a.id)" class="mt-1" @update:model-value="toggleSelect(a.id)" />
            <UIcon
              :name="severityIcon[a.severity] || 'lucide:info'"
              class="mt-0.5 text-lg"
              :class="`text-${severityColor[a.severity]}`"
            />
            <div class="min-w-0 flex-1">
              <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <h3 class="break-words font-bold">
                  {{ a.title }}
                </h3>
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge variant="outline" size="xs">
                    {{ categoryLabel(a.type) }}
                  </UBadge>
                  <UBadge variant="outline" size="xs">
                    {{ typeLabel(a.type) }}
                  </UBadge>
                  <UBadge :color="severityColor[a.severity] || 'info'" variant="subtle" size="xs">
                    {{ a.severity }}
                  </UBadge>
                  <UBadge :color="statusColor[getAlertStatus(a)]" variant="subtle" size="xs">
                    {{ statusLabel(getAlertStatus(a)) }}
                  </UBadge>
                </div>
              </div>
              <p class="mt-1 break-words text-sm text-muted">
                {{ a.message }}
              </p>
              <p class="mt-2 text-xs text-muted">
                {{ new Date(a.createdAt).toLocaleString() }}
              </p>
            </div>
          </div>
          <div class="flex shrink-0 justify-end gap-2 sm:flex-col">
            <UButton
              v-if="getAlertStatus(a) === 'open'"
              size="xs"
              variant="ghost"
              icon="lucide:check"
              @click="handleStatus(a.id, 'acknowledged')"
            >
              {{ p('acknowledge') }}
            </UButton>
            <UButton
              v-if="getAlertStatus(a) !== 'resolved'"
              size="xs"
              variant="ghost"
              icon="lucide:check-circle"
              @click="handleStatus(a.id, 'resolved')"
            >
              {{ p('resolve') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="hasSelection"
        class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-default bg-default px-5 py-3 shadow-lg"
      >
        <span class="text-sm font-medium">{{ $t('common.selectedCount', { count: selectedCount }) }}</span>
        <UButton size="sm" variant="soft" icon="lucide:check" @click="batchAcknowledge">
          {{ p('batchAcknowledge') }}
        </UButton>
        <UButton size="sm" color="error" variant="soft" icon="lucide:trash-2" @click="batchDelete(list)">
          {{ $t('common.batchDelete') }}
        </UButton>
      </div>
    </Transition>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>
  </div>
</template>
