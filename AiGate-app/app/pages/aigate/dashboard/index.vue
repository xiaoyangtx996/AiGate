<script setup lang="ts">
const { getDashboard } = useAigateApi()
const { t } = useI18n()

const timeRange = ref('7d')
const timeRangeOptions = [
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
  { label: '近 90 天', value: '90d' },
]

const { data, pending: loading, refresh } = await useAsyncData('aigate-dashboard', async () => {
  const res = await getDashboard({ range: timeRange.value })
  return res.data || {}
}, { watch: [timeRange] })

const overview = computed(() => data.value?.overview || {})
const trend = computed(() => data.value?.trend?.daily || [])
const modelBreakdown = computed(() => data.value?.modelBreakdown || [])
const statusDistribution = computed(() => data.value?.statusDistribution || {})
const quotaStatus = computed(() => data.value?.quotaStatus || [])

const trendData = computed(() => ({
  labels: trend.value.map((d: any) => d.date),
  datasets: [
    {
      label: 'Token 用量',
      data: trend.value.map((d: any) => d.tokens),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
    },
  ],
}))

const modelData = computed(() => ({
  labels: modelBreakdown.value.map((m: any) => m.model),
  datasets: [
    {
      label: 'Token 用量',
      data: modelBreakdown.value.map((m: any) => m.tokens),
      backgroundColor: [
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)',
        'rgb(139, 92, 246)',
        'rgb(236, 72, 153)',
        'rgb(20, 184, 166)',
        'rgb(249, 115, 22)',
        'rgb(99, 102, 241)',
        'rgb(168, 85, 247)',
      ],
    },
  ],
}))

function formatTokens(n: number) {
  if (!n) return '0'
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
}

function getQuotaColor(pct: number) {
  return pct > 90 ? 'error' : pct > 70 ? 'warning' : 'success'
}

const p = (key: string) => t(`pages.aigate.dashboard.${key}`)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">{{ p('title') }}</h2>
      <div class="flex items-center gap-2">
        <USelect v-model="timeRange" :items="timeRangeOptions" class="w-36" />
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="refresh()" />
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary">{{ formatTokens(overview.totalTokens) }}</p>
          <p class="text-sm text-muted">{{ p('totalTokens') }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success">{{ overview.activeKeys || 0 }}</p>
          <p class="text-sm text-muted">{{ p('activeKeys') }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning">{{ overview.expiringSoon || 0 }}</p>
          <p class="text-sm text-muted">{{ p('expiringSoon') }}</p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold">{{ overview.activeChannels || 0 }}/{{ overview.totalChannels || 0 }}</p>
          <p class="text-sm text-muted">{{ p('activeChannels') }}</p>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h3 class="font-bold">{{ p('tokenTrend') }}</h3>
        </template>
        <div v-if="trend.length > 0" class="h-64">
          <LineChart :data="trendData" />
        </div>
        <div v-else class="h-64 flex items-center justify-center text-muted">
          <p>{{ p('noTrend') }}</p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-bold">{{ p('modelDist') }}</h3>
        </template>
        <div v-if="modelBreakdown.length > 0" class="h-64">
          <BarChart :data="modelData" />
        </div>
        <div v-else class="h-64 flex items-center justify-center text-muted">
          <p>{{ p('noModel') }}</p>
        </div>
      </UCard>
    </div>

    <UCard v-if="quotaStatus.length > 0">
      <template #header>
        <h3 class="font-bold">{{ p('orgQuota') }}</h3>
      </template>
      <div class="space-y-3">
        <div v-for="org in quotaStatus" :key="org.organizationId" class="flex items-center gap-4">
          <div class="w-40 truncate font-medium">{{ org.organizationName }}</div>
          <div class="flex-1">
            <UProgress :model-value="org.usedPercentage" :color="getQuotaColor(org.usedPercentage)" />
          </div>
          <div class="w-16 text-right text-sm font-mono">{{ org.usedPercentage }}%</div>
          <UBadge v-if="org.isWarning" color="warning" variant="subtle" size="xs">预警</UBadge>
        </div>
      </div>
    </UCard>
  </div>
</template>
