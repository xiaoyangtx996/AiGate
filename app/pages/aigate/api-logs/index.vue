<script setup lang="ts">
import HeaderContent from './components/HeaderContent.vue'

interface ApiLogRow {
  id: string
  createdAt: string
  userId?: string | null
  apiKeyId?: string | null
  agentId?: string | null
  organizationId?: string | null
  model: string
  provider?: string | null
  type?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  cachedTokens?: number | null
  tokensEstimated?: boolean | null
  latency?: number | null
  cost?: number | null
  status: string
  statusCode?: number | null
  errorMessage?: string | null
  prompt?: string | null
  response?: string | null
  traceId?: string | null
}

const { getApiLogList } = useAigateApi()
const { t } = useI18n()
const { exportToCSV } = useExport()
const { successToast } = useAppToast()

const page = ref(1)
const pageSize = ref(20)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
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

const list = computed(() => (data.value?.items ?? []) as ApiLogRow[])
const total = computed(() => data.value?.total ?? 0)
const detailOpen = ref(false)
const selectedLog = ref<ApiLogRow | null>(null)
const statusColor: Record<string, 'success' | 'error' | 'warning'> = {
  success: 'success',
  error: 'error',
  rate_limited: 'warning',
}

function formatLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function formatCost(cost?: number | null) {
  return `¥${Number(cost || 0).toFixed(8)}`
}

function showDetail(row: ApiLogRow) {
  selectedLog.value = row
  detailOpen.value = true
}

async function copyTraceId(traceId?: string | null) {
  if (!traceId)
    return
  await navigator.clipboard?.writeText(traceId)
  successToast('Trace ID copied')
}

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
    <UTable
      v-else
      :data="list"
      :columns="[
        { accessorKey: 'createdAt', header: p('time') },
        { accessorKey: 'model', header: p('model') },
        { accessorKey: 'totalTokens', header: p('tokens') },
        { accessorKey: 'latency', header: p('latency') },
        { accessorKey: 'cost', header: p('cost') },
        { accessorKey: 'status', header: p('status') },
        { accessorKey: 'actions', header: $t('common.action') },
      ]"
    >
      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ new Date(row.original.createdAt).toLocaleString() }}</span>
      </template>
      <template #totalTokens-cell="{ row }">
        <div class="flex items-center gap-2">
          <span class="font-mono">{{ (row.original.totalTokens || 0).toLocaleString() }}</span>
          <UBadge v-if="row.original.tokensEstimated" color="warning" variant="subtle" size="xs">
            估算
          </UBadge>
        </div>
      </template>
      <template #latency-cell="{ row }">
        <span class="font-mono">{{ formatLatency(row.original.latency || 0) }}</span>
      </template>
      <template #cost-cell="{ row }">
        <span class="font-mono">{{ formatCost(row.original.cost) }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] || 'neutral'" variant="subtle" size="sm">
          {{ row.original.statusCode || 200 }}
        </UBadge>
      </template>
      <template #actions-cell="{ row }">
        <UButton size="xs" variant="ghost" icon="lucide:panel-right-open" @click="showDetail(row.original)" />
      </template>
    </UTable>
    <div v-if="total > 0" class="flex justify-end">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>

    <USlideover v-model:open="detailOpen">
      <template #header>
        <div>
          <h3 class="font-bold">
            API Log Detail
          </h3>
          <p class="font-mono text-xs text-muted">
            {{ selectedLog?.id }}
          </p>
        </div>
      </template>
      <template #body>
        <div v-if="selectedLog" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Model
              </p>
              <p class="font-medium">
                {{ selectedLog.model }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Status
              </p>
              <UBadge :color="statusColor[selectedLog.status] || 'neutral'" variant="subtle">
                {{ selectedLog.statusCode || 200 }}
              </UBadge>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Caller
              </p>
              <p class="font-mono text-xs">
                {{ selectedLog.userId || selectedLog.apiKeyId || '-' }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Trace ID
              </p>
              <div class="flex items-center gap-2">
                <p class="truncate font-mono text-xs">
                  {{ selectedLog.traceId || '-' }}
                </p>
                <UButton
                  v-if="selectedLog.traceId"
                  size="xs"
                  variant="ghost"
                  icon="lucide:copy"
                  @click="copyTraceId(selectedLog.traceId)"
                />
              </div>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Provider
              </p>
              <p class="font-medium">
                {{ selectedLog.provider || '-' }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Latency
              </p>
              <p class="font-medium">
                {{ formatLatency(selectedLog.latency || 0) }}
              </p>
            </div>
          </div>

          <div class="rounded-md border p-3">
            <p class="mb-2 text-sm font-medium">
              Tokens
            </p>
            <div class="grid grid-cols-4 gap-2 text-sm">
              <div><span class="text-muted">Input</span><p>{{ selectedLog.inputTokens || 0 }}</p></div>
              <div><span class="text-muted">Output</span><p>{{ selectedLog.outputTokens || 0 }}</p></div>
              <div><span class="text-muted">Cached</span><p>{{ selectedLog.cachedTokens || 0 }}</p></div>
              <div>
                <span class="text-muted">Total</span>
                <p class="flex items-center gap-2">
                  {{ selectedLog.totalTokens || 0 }}
                  <UBadge v-if="selectedLog.tokensEstimated" color="warning" variant="subtle" size="xs">
                    估算
                  </UBadge>
                </p>
              </div>
            </div>
          </div>

          <div v-if="selectedLog.errorMessage" class="rounded-md border border-error/30 p-3 text-sm text-error">
            {{ selectedLog.errorMessage }}
          </div>

          <div class="grid gap-3 lg:grid-cols-2">
            <div class="rounded-md border p-3">
              <p class="mb-2 text-sm font-medium">
                Request
              </p>
              <pre class="max-h-[45vh] overflow-auto whitespace-pre-wrap text-xs">{{ selectedLog.prompt || 'Not captured. Enable Gateway debug mode to store request bodies.' }}</pre>
            </div>
            <div class="rounded-md border p-3">
              <p class="mb-2 text-sm font-medium">
                Response
              </p>
              <pre class="max-h-[45vh] overflow-auto whitespace-pre-wrap text-xs">{{ selectedLog.response || 'Not captured. Enable Gateway debug mode to store response bodies.' }}</pre>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
