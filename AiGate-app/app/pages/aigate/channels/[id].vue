<script setup lang="ts">
interface ChannelDetail {
  id: string
  name: string
  vendor: string
  endpoint: string
  apiKey?: string | null
  status: string
  health: string
  priority?: number | null
  weight?: number | null
  qps?: number | null
  rateLimitQps?: number | null
  rateLimitTpm?: number | null
  rateLimitRpm?: number | null
  rateLimitStrategy?: string | null
  models?: string[] | null
}

interface ChannelTrendItem {
  time: string
  requests: number
  success: number
  avgLatency: number
}

interface ChannelStats {
  totalRequests: number
  successRate: string
  avgLatency: number
  trend: ChannelTrendItem[]
}

interface ChannelStatsResponse {
  data?: {
    channel: ChannelDetail
    stats: ChannelStats
  }
}

const route = useRoute()
const router = useRouter()
const { delChannel, checkChannelHealth } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const { i18nCommon } = useMessage()
const confirm = useConfirmDialog()
const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.channels.detail.${key}`, params ?? {})

const id = computed(() => String(route.params.id))
const { data, pending: loading, refresh } = await useAsyncData(`aigate-channel-${id.value}`, async () => {
  const res = await $fetch<ChannelStatsResponse>(`/api/aigate/channel/${id.value}/stats`)
  return res.data
})

const channel = computed(() => data.value?.channel)
const stats = computed<ChannelStats>(() => data.value?.stats ?? {
  totalRequests: 0,
  successRate: '0%',
  avgLatency: 0,
  trend: [],
})
const checking = ref(false)

const statusColor: Record<string, 'success' | 'neutral'> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, 'success' | 'warning' | 'error'> = { healthy: 'success', degraded: 'warning', down: 'error' }

function maskKey(key?: string | null) {
  if (!key)
    return '-'
  return key.length > 16 ? `${key.slice(0, 8)}...${key.slice(-4)}` : '***'
}

async function handleHealthCheck() {
  checking.value = true
  try {
    const res = await checkChannelHealth(id.value)
    successToast(
      res.data?.healthy ? p('healthSingleOk', { name: channel.value?.name || '-' }) : p('healthSingleFail', { name: channel.value?.name || '-' }),
    )
    await refresh()
  }
  finally {
    checking.value = false
  }
}

async function handleDelete() {
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delChannel(id.value)
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    router.push('/aigate/channels')
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/channels" />
        <div>
          <h2 class="text-xl font-bold">
            {{ p('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ channel?.name || '-' }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <UButton v-permission="'EDIT'" :loading="checking" icon="lucide:heart-pulse" variant="outline" @click="handleHealthCheck">
          {{ p('healthCheck') }}
        </UButton>
        <UButton v-permission="'DELETE'" icon="lucide:trash-2" color="error" variant="ghost" @click="handleDelete">
          {{ p('delete') }}
        </UButton>
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="4" :rows="4" />
    <EmptyState
      v-else-if="!channel"
      icon="lucide:radio-tower"
      :title="p('notFound')"
      :description="p('notFoundDesc')"
    />
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-muted">
            {{ p('totalRequests') }}
          </p>
          <p class="text-2xl font-bold">
            {{ stats.totalRequests || 0 }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ p('successRate') }}
          </p>
          <p class="text-2xl font-bold text-success">
            {{ stats.successRate || '0%' }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ p('avgLatency') }}
          </p>
          <p class="text-2xl font-bold">
            {{ stats.avgLatency || 0 }}ms
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ p('healthStatus') }}
          </p>
          <UBadge :color="healthColor[channel?.health || 'down'] || 'error'" variant="subtle">
            {{ channel?.health || '-' }}
          </UBadge>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <h3 class="font-bold">
              {{ p('basicInfo') }}
            </h3>
          </template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">{{ $t('pages.aigate.channels.name') }}</span><span>{{ channel?.name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ $t('pages.aigate.channels.vendor') }}</span><span>{{ channel?.vendor }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ $t('pages.aigate.channels.endpoint') }}</span><code class="text-xs">{{ channel?.endpoint }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ $t('pages.aigate.channels.apiKey') }}</span><code class="text-xs">{{ maskKey(channel?.apiKey) }}</code>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ $t('pages.aigate.channels.status') }}</span>
              <UBadge :color="statusColor[channel?.status || 'disabled'] || 'neutral'" variant="subtle">
                {{ channel?.status }}
              </UBadge>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('priority') }}</span><span>{{ channel?.priority }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('weight') }}</span><span>{{ channel?.weight }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-bold">
              {{ p('rateLimit') }}
            </h3>
          </template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">{{ $t('pages.aigate.channels.qps') }}</span><span>{{ channel?.qps }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('rateLimitQps') }}</span><span>{{ channel?.rateLimitQps }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('rateLimitTpm') }}</span><span>{{ channel?.rateLimitTpm }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('rateLimitRpm') }}</span><span>{{ channel?.rateLimitRpm }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('strategy') }}</span><span>{{ channel?.rateLimitStrategy }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h3 class="font-bold">
            {{ p('models') }}
          </h3>
        </template>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="model in (channel?.models || [])" :key="model" variant="outline">
            {{ model }}
          </UBadge>
          <span v-if="!channel?.models?.length" class="text-sm text-muted">{{ p('noModels') }}</span>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-bold">
            {{ p('trend24h') }}
          </h3>
        </template>
        <EmptyState
          v-if="!(stats.trend || []).length"
          icon="lucide:activity"
          :title="p('noTrend')"
          :description="p('noTrendDesc')"
        />
        <div v-else class="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <div v-for="item in stats.trend" :key="item.time" class="rounded bg-muted p-2">
            <p class="truncate">
              {{ item.time }}
            </p>
            <p class="font-mono">
              {{ item.requests }} req
            </p>
            <p class="text-muted">
              {{ item.avgLatency }}ms
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
