<script setup lang="ts">
const { getDashboard } = useAigateApi()
const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.dashboard.${key}`)

const timeRange = ref('7d')
const timeRangeOptions = computed(() => [
  { label: p('range7d'), value: '7d' },
  { label: p('range30d'), value: '30d' },
  { label: p('range90d'), value: '90d' },
])

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-dashboard',
  async () => {
    const res = await getDashboard({ range: timeRange.value })
    return res.data || {}
  },
  { watch: [timeRange], dedupe: 'defer' },
)

const overview = computed(() => data.value?.overview || {})
const trend = computed<TrendPoint[]>(() => (data.value?.trend?.daily as TrendPoint[]) || [])
const modelBreakdown = computed<ModelPoint[]>(() => (data.value?.modelBreakdown as ModelPoint[]) || [])
const topConsumers = computed<ConsumerPoint[]>(() => (data.value?.topConsumers as ConsumerPoint[]) || [])
const quotaStatus = computed(() => data.value?.quotaStatus || [])

interface TrendPoint {
  date: string
  tokens: number
}
interface ModelPoint {
  model: string
  tokens: number
  cost?: number
}
interface ConsumerPoint {
  principal: string
  tokens: number
}

const stackedTrend = computed(() => data.value?.trend?.dailyByModel as { models?: string[], rows?: Record<string, unknown>[] } | undefined)
const stackedModels = computed(() => stackedTrend.value?.models ?? [])
const stackedTrendRows = computed(() => stackedTrend.value?.rows ?? [])

const trendData = computed(() => ({
  labels: trend.value.map((d: TrendPoint) => d.date),
  datasets: [
    {
      label: p('tokenUsageLabel'),
      data: trend.value.map((d: TrendPoint) => d.tokens),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
    },
  ],
}))

const modelData = computed(() => ({
  labels: modelBreakdown.value.slice(0, 5).map((m: ModelPoint) => m.model),
  datasets: [
    {
      label: p('tokenUsageLabel'),
      data: modelBreakdown.value.slice(0, 5).map((m: ModelPoint) => m.tokens),
    },
    {
      label: 'Cost',
      data: modelBreakdown.value.slice(0, 5).map((m: ModelPoint) => m.cost ?? 0),
    },
  ],
}))

const consumerData = computed(() => ({
  labels: topConsumers.value.map((item: ConsumerPoint) => item.principal),
  datasets: [
    {
      label: 'Token usage',
      data: topConsumers.value.map((item: ConsumerPoint) => item.tokens),
      backgroundColor: ['rgb(245, 158, 11)', 'rgb(16, 185, 129)', 'rgb(59, 130, 246)', 'rgb(239, 68, 68)', 'rgb(20, 184, 166)'],
    },
  ],
}))

function formatTokens(n: number) {
  if (!n)
    return '0'
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
}

function getQuotaColor(pct: number) {
  return pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
}

const DashboardCharts = defineAsyncComponent(() => import('@/components/aigate/DashboardCharts.vue'))
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <div class="flex items-center gap-2">
        <USelect v-model="timeRange" :items="timeRangeOptions" class="w-36" />
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="refresh()" />
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">
            {{ formatTokens(overview.totalTokens) }}
          </p>
          <p class="text-sm text-muted">
            {{ p('totalTokens') }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success">
            {{ overview.activeKeys || 0 }}
          </p>
          <p class="text-sm text-muted">
            {{ p('activeKeys') }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning">
            {{ overview.expiringSoon || 0 }}
          </p>
          <p class="text-sm text-muted">
            {{ p('expiringSoon') }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold">
            {{ overview.activeChannels || 0 }}/{{ overview.totalChannels || 0 }}
          </p>
          <p class="text-sm text-muted">
            {{ p('activeChannels') }}
          </p>
        </div>
      </UCard>
    </div>

    <ClientOnly>
      <Suspense>
        <DashboardCharts
          :trend-data="trendData"
          :stacked-trend-rows="stackedTrendRows"
          :stacked-models="stackedModels"
          :model-data="modelData"
          :consumer-data="consumerData"
          :trend-title="p('tokenTrend')"
          :model-title="p('modelDist')"
          consumer-title="Top Consumers"
          :no-trend="p('noTrend')"
          :no-model="p('noModel')"
          no-consumer="No consumer data"
          :has-trend="trend.length > 0"
          :has-model="modelBreakdown.length > 0"
          :has-consumer="topConsumers.length > 0"
        />
        <template #fallback>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableSkeleton :cols="1" :rows="6" />
            <TableSkeleton :cols="1" :rows="6" />
          </div>
        </template>
      </Suspense>
    </ClientOnly>

    <UCard v-if="quotaStatus.length > 0">
      <template #header>
        <h3 class="font-bold">
          {{ p('orgQuota') }}
        </h3>
      </template>
      <div class="space-y-3">
        <div v-for="org in quotaStatus" :key="org.organizationId" class="flex items-center gap-4">
          <div class="w-40 truncate font-medium">
            {{ org.organizationName }}
          </div>
          <div class="flex-1">
            <UProgress :model-value="org.usedPercentage" :color="getQuotaColor(org.usedPercentage)" />
          </div>
          <div class="w-16 text-right text-sm font-mono">
            {{ org.usedPercentage }}%
          </div>
          <UBadge v-if="org.isWarning" color="warning" variant="subtle" size="xs">
            {{ p('quotaWarning') }}
          </UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
