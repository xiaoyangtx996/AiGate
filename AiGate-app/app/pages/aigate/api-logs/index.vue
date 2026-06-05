<script setup lang="ts">
import HeaderContent from './components/HeaderContent.vue'

const { getApiLogList } = useAigateApi()
const { t } = useI18n()
const { exportToCSV } = useExport()

const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-api-logs',
  async () => {
    const res = await getApiLogList({ page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const statusColor: Record<string, string> = { success: 'success', error: 'error', rate_limited: 'warning' }

function formatLatency(ms: number) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms` }

function handleExport() {
  exportToCSV(
    list.value.map(item => ({
      createdAt: item.createdAt,
      model: item.model,
      totalTokens: item.totalTokens,
      latency: item.latency,
      cost: item.cost,
      status: item.status,
      statusCode: item.statusCode,
    })),
    'api-logs-export',
  )
}

const p = (key: string) => t(`pages.aigate.apiLogs.${key}`)
</script>

<template>
  <div class="space-y-4">
    <HeaderContent :loading :refresh :handle-export />
    <TableSkeleton v-if="loading" :cols="6" :rows="8" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:scroll-text"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable v-else :data="list" :columns="[
      { accessorKey: 'createdAt', header: p('time') },
      { accessorKey: 'model', header: p('model') },
      { accessorKey: 'totalTokens', header: p('tokens') },
      { accessorKey: 'latency', header: p('latency') },
      { accessorKey: 'cost', header: p('cost') },
      { accessorKey: 'status', header: p('status') },
    ]">
      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ new Date(row.original.createdAt).toLocaleString() }}</span>
      </template>
      <template #totalTokens-cell="{ row }">
        <span class="font-mono">{{ (row.original.totalTokens || 0).toLocaleString() }}</span>
      </template>
      <template #latency-cell="{ row }">
        <span class="font-mono">{{ formatLatency(row.original.latency || 0) }}</span>
      </template>
      <template #cost-cell="{ row }">
        <span class="font-mono">${{ (row.original.cost / 10000).toFixed(4) }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] as any" variant="subtle" size="sm">
          {{ row.original.statusCode || 200 }}
        </UBadge>
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
