<script setup lang="ts">
const { getApiLogList } = useAigateApi()
const { data, pending: loading, refresh } = await useAsyncData('aigate-api-logs', async () => {
  const res = await getApiLogList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
const statusColor: Record<string, string> = { success: 'success', error: 'error', rate_limited: 'warning' }
function formatLatency(ms: number) { return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms` }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">调用日志</h2>
      <UButton variant="outline" icon="lucide:refresh-cw" @click="refresh">刷新</UButton>
    </div>
    <UTable :loading :data="list" :columns="[
      { accessorKey: 'createdAt', header: '时间' },
      { accessorKey: 'model', header: '模型' },
      { accessorKey: 'totalTokens', header: 'Tokens' },
      { accessorKey: 'latency', header: '延迟' },
      { accessorKey: 'cost', header: '费用' },
      { accessorKey: 'status', header: '状态' },
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
  </div>
</template>
