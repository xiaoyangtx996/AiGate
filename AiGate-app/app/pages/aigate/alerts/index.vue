<script setup lang="ts">
interface AlertRow {
  id: string
  title: string
  message: string
  type: string
  severity: string
  read: boolean
  createdAt: string
}

const { getAlertList, markAlertRead, delAlert, runAlertCheck } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-alerts',
  async () => {
    const res = await getAlertList({ page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => (data.value?.items ?? []) as AlertRow[])
const total = computed(() => data.value?.total ?? 0)
const unreadCount = computed(() => list.value.filter(a => !a.read).length)
const checking = ref(false)

const {
  selectedCount,
  hasSelection,
  isSelected,
  toggleSelect,
  clearSelection,
  getSelectedItems,
  batchDelete,
} = useBatchOperations<AlertRow>({
  onDelete: async (items) => {
    await Promise.all(items.map(item => delAlert(item.id)))
    refresh()
  },
})

async function handleRead(id: string) {
  await markAlertRead(id)
  refresh()
}

async function batchMarkRead() {
  const items = getSelectedItems(list.value).filter(a => !a.read)
  if (items.length === 0)
    return
  await Promise.all(items.map(item => markAlertRead(item.id)))
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
  finally { checking.value = false }
}

const severityColor: Record<string, 'info' | 'warning' | 'error'> = { info: 'info', warning: 'warning', critical: 'error' }
const severityIcon: Record<string, string> = { info: 'lucide:info', warning: 'lucide:alert-triangle', critical: 'lucide:alert-octagon' }

const p = (key: string) => t(`pages.aigate.alerts.${key}`)
const typeLabel = (type: string) => t(`pages.aigate.alerts.types.${type}`, type)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-xl font-bold">{{ p('title') }}</h2>
        <UBadge v-if="unreadCount > 0" color="error" variant="solid" size="sm">
          {{ unreadCount }} {{ p('unread') }}
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
        :class="!a.read ? 'border-l-4 border-l-warning' : 'opacity-60'"
      >
        <div class="flex items-start gap-3">
          <UCheckbox
            :model-value="isSelected(a.id)"
            class="mt-1"
            @update:model-value="toggleSelect(a.id)"
          />
          <UIcon
            :name="severityIcon[a.severity] || 'lucide:info'"
            class="text-lg mt-0.5"
            :class="`text-${severityColor[a.severity]}`"
          />
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="font-bold">{{ a.title }}</h3>
              <div class="flex items-center gap-2">
                <UBadge variant="outline" size="xs">{{ typeLabel(a.type) }}</UBadge>
                <UBadge :color="severityColor[a.severity] || 'info'" variant="subtle" size="xs">{{ a.severity }}</UBadge>
              </div>
            </div>
            <p class="text-sm text-muted mt-1">{{ a.message }}</p>
            <p class="text-xs text-muted mt-2">{{ new Date(a.createdAt).toLocaleString() }}</p>
          </div>
          <UButton v-if="!a.read" size="xs" variant="ghost" @click="handleRead(a.id)">
            {{ p('markRead') }}
          </UButton>
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
        <UButton
          size="sm"
          variant="soft"
          icon="lucide:check"
          @click="batchMarkRead"
        >
          {{ p('batchMarkRead') }}
        </UButton>
        <UButton
          size="sm"
          color="error"
          variant="soft"
          icon="lucide:trash-2"
          @click="batchDelete(list)"
        >
          {{ $t('common.batchDelete') }}
        </UButton>
      </div>
    </Transition>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
      />
    </div>
  </div>
</template>
