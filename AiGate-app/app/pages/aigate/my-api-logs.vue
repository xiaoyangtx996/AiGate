<script setup lang="ts">
interface ApiLogRow {
  id: string
  createdAt: string
  model: string
  provider?: string | null
  totalTokens?: number | null
  latency?: number | null
  cost?: number | null
  status: string
  statusCode?: number | null
  errorMessage?: string | null
}

const { t } = useI18n()
const { getMyApiLogList } = useAigateApi()
const p = (key: string) => t(`pages.aigate.myApiLogs.${key}`)

const page = ref(1)
const pageSize = ref(20)
const model = ref('')
const status = ref('')

const { data, pending: loading, refresh } = await useAsyncData('aigate-my-api-logs', async () => {
  const res = await getMyApiLogList({
    page: page.value,
    pageSize: pageSize.value,
    model: model.value || undefined,
    status: status.value || undefined,
  })
  return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
}, { watch: [page, pageSize, status], dedupe: 'defer' })

const list = computed(() => (data.value?.items ?? []) as ApiLogRow[])
const total = computed(() => data.value?.total ?? 0)
const statusItems = computed(() => [
  { label: p('statusAll'), value: '' },
  { label: p('statusSuccess'), value: 'success' },
  { label: p('statusError'), value: 'error' },
  { label: p('statusRateLimited'), value: 'rate_limited' },
])
const statusColor: Record<string, 'success' | 'error' | 'warning'> = { success: 'success', error: 'error', rate_limited: 'warning' }

function search() {
  page.value = 1
  refresh()
}

function formatLatency(ms?: number | null) {
  const value = ms ?? 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`
}

function formatCost(cents?: number | null) {
  return `¥${((cents ?? 0) / 100).toFixed(2)}`
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <UInput v-model="model" class="w-48" icon="lucide:search" :placeholder="p('modelSearch')" @keyup.enter="search" />
        <USelect v-model="status" :items="statusItems" class="w-36" />
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="search" />
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="7" :rows="8" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:scroll-text"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable
      v-else
      :data="list"
      :columns="[
        { accessorKey: 'createdAt', header: p('time') },
        { accessorKey: 'model', header: p('model') },
        { accessorKey: 'provider', header: p('provider') },
        { accessorKey: 'totalTokens', header: p('tokens') },
        { accessorKey: 'latency', header: p('latency') },
        { accessorKey: 'cost', header: p('cost') },
        { accessorKey: 'status', header: p('status') },
      ]"
    >
      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ new Date(row.original.createdAt).toLocaleString() }}</span>
      </template>
      <template #totalTokens-cell="{ row }">
        <span class="font-mono">{{ (row.original.totalTokens || 0).toLocaleString() }}</span>
      </template>
      <template #latency-cell="{ row }">
        <span class="font-mono">{{ formatLatency(row.original.latency) }}</span>
      </template>
      <template #cost-cell="{ row }">
        <span class="font-mono">{{ formatCost(row.original.cost) }}</span>
      </template>
      <template #status-cell="{ row }">
        <div class="flex items-center gap-2">
          <UBadge :color="statusColor[row.original.status] || 'neutral'" variant="subtle" size="sm">
            {{ row.original.statusCode || 200 }}
          </UBadge>
          <span v-if="row.original.errorMessage" class="max-w-48 truncate text-xs text-error">{{ row.original.errorMessage }}</span>
        </div>
      </template>
    </UTable>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
      />
    </div>
  </div>
</template>
