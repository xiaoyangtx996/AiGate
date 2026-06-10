<script setup lang="ts">
interface ApiLogRow {
  id: string
  model: string
  provider?: string | null
  status: string
  statusCode?: number | null
  totalTokens?: number | null
  cost?: number | null
  latency?: number | null
  errorMessage?: string | null
  createdAt: string
}

const route = useRoute()
const { getAgent, getApiLogList } = useAigateApi()
const { t } = useI18n()

const agentId = computed(() => String(route.params.id))
const { data: agent } = await useAsyncData(`aigate-agent-logs-agent-${agentId.value}`, async () => {
  const res = await getAgent(agentId.value)
  return res.data as { id: string, name: string, model?: string | null } | null
})

const { data, pending: loading, refresh } = await useAsyncData(`aigate-agent-logs-${agentId.value}`, async () => {
  const res = await getApiLogList({ agentId: agentId.value, pageSize: 100 })
  const payload = res.data
  return (payload?.items ?? payload ?? []) as ApiLogRow[]
}, { watch: [agentId] })

const list = computed(() => data.value || [])
const statusColor: Record<string, 'success' | 'error' | 'warning'> = { success: 'success', error: 'error', rate_limited: 'warning' }

function formatCost(cents?: number | null) {
  return `¥${((cents || 0) / 100).toFixed(2)}`
}

function formatLatency(ms?: number | null) {
  const value = ms || 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`
}

const p = (key: string) => t(`pages.aigate.agents.logs.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/agents" />
        <div>
          <h2 class="text-xl font-bold">
            {{ p('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ agent?.name || agentId }}
          </p>
        </div>
      </div>
      <UButton variant="outline" icon="lucide:refresh-cw" :loading="loading" @click="refresh()">
        {{ p('refresh') }}
      </UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="8" :rows="8" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:scroll-text"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable
      v-else :data="list" :columns="[
        { accessorKey: 'createdAt', header: p('time') },
        { accessorKey: 'model', header: p('model') },
        { accessorKey: 'provider', header: p('provider') },
        { accessorKey: 'status', header: p('status') },
        { accessorKey: 'totalTokens', header: p('tokens') },
        { accessorKey: 'cost', header: p('cost') },
        { accessorKey: 'latency', header: p('latency') },
        { accessorKey: 'errorMessage', header: p('error') },
      ]"
    >
      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ new Date(row.original.createdAt).toLocaleString() }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] || 'neutral'" variant="subtle" size="sm">
          {{ row.original.statusCode || row.original.status }}
        </UBadge>
      </template>
      <template #totalTokens-cell="{ row }">
        <span class="font-mono">{{ (row.original.totalTokens || 0).toLocaleString() }}</span>
      </template>
      <template #cost-cell="{ row }">
        <span class="font-mono">{{ formatCost(row.original.cost) }}</span>
      </template>
      <template #latency-cell="{ row }">
        <span class="font-mono">{{ formatLatency(row.original.latency) }}</span>
      </template>
      <template #errorMessage-cell="{ row }">
        <span class="text-xs text-error">{{ row.original.errorMessage || '-' }}</span>
      </template>
    </UTable>
  </div>
</template>
