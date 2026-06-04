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

const id = computed(() => String(route.params.id))
const { data, pending: loading, refresh } = await useAsyncData(`aigate-channel-${id.value}`, async () => {
  const res = await $fetch<ChannelStatsResponse>(`/api/aigate/channel/${id.value}/stats`)
  return res.data
})

const channel = computed(() => data.value?.channel)
const stats = computed(() => data.value?.stats || {})
const checking = ref(false)

const statusColor: Record<string, string> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }

function maskKey(key?: string | null) {
  if (!key) return '-'
  return key.length > 16 ? `${key.slice(0, 8)}...${key.slice(-4)}` : '***'
}

async function handleHealthCheck() {
  checking.value = true
  try {
    const res = await checkChannelHealth(id.value)
    successToast(`健康检查完成：${res.data?.healthy ? '正常' : '异常'}`)
    await refresh()
  }
  finally {
    checking.value = false
  }
}

async function handleDelete() {
  if (!confirm('确定删除该渠道吗？')) return
  await delChannel(id.value)
  successToast()
  router.push('/aigate/channels')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/channels" />
        <div>
          <h2 class="text-xl font-bold">渠道详情</h2>
          <p class="text-sm text-muted">{{ channel?.name || '-' }}</p>
        </div>
      </div>
      <div class="flex gap-2">
        <UButton :loading="checking" icon="lucide:heart-pulse" variant="outline" @click="handleHealthCheck">健康检查</UButton>
        <UButton icon="lucide:trash-2" color="error" variant="ghost" @click="handleDelete">删除</UButton>
      </div>
    </div>

    <UCard v-if="!channel && !loading">
      <div class="text-center py-8 text-muted">渠道不存在或无权访问</div>
    </UCard>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-muted">总请求数</p>
          <p class="text-2xl font-bold">{{ stats.totalRequests || 0 }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">成功率</p>
          <p class="text-2xl font-bold text-success">{{ stats.successRate || '0%' }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">平均延迟</p>
          <p class="text-2xl font-bold">{{ stats.avgLatency || 0 }}ms</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">健康状态</p>
          <UBadge :color="healthColor[channel?.health || 'down'] as any" variant="subtle">{{ channel?.health || '-' }}</UBadge>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UCard :loading="loading">
          <template #header><h3 class="font-bold">基本信息</h3></template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-muted">名称</span><span>{{ channel?.name }}</span></div>
            <div class="flex justify-between"><span class="text-muted">供应商</span><span>{{ channel?.vendor }}</span></div>
            <div class="flex justify-between"><span class="text-muted">Endpoint</span><code class="text-xs">{{ channel?.endpoint }}</code></div>
            <div class="flex justify-between"><span class="text-muted">API Key</span><code class="text-xs">{{ maskKey(channel?.apiKey) }}</code></div>
            <div class="flex justify-between"><span class="text-muted">状态</span><UBadge :color="statusColor[channel?.status || 'disabled'] as any" variant="subtle">{{ channel?.status }}</UBadge></div>
            <div class="flex justify-between"><span class="text-muted">优先级</span><span>{{ channel?.priority }}</span></div>
            <div class="flex justify-between"><span class="text-muted">权重</span><span>{{ channel?.weight }}</span></div>
          </div>
        </UCard>

        <UCard :loading="loading">
          <template #header><h3 class="font-bold">限流配置</h3></template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between"><span class="text-muted">QPS</span><span>{{ channel?.qps }}</span></div>
            <div class="flex justify-between"><span class="text-muted">Rate Limit QPS</span><span>{{ channel?.rateLimitQps }}</span></div>
            <div class="flex justify-between"><span class="text-muted">Rate Limit TPM</span><span>{{ channel?.rateLimitTpm }}</span></div>
            <div class="flex justify-between"><span class="text-muted">Rate Limit RPM</span><span>{{ channel?.rateLimitRpm }}</span></div>
            <div class="flex justify-between"><span class="text-muted">策略</span><span>{{ channel?.rateLimitStrategy }}</span></div>
          </div>
        </UCard>
      </div>

      <UCard :loading="loading">
        <template #header><h3 class="font-bold">模型列表</h3></template>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="model in (channel?.models || [])" :key="model" variant="outline">{{ model }}</UBadge>
          <span v-if="!channel?.models?.length" class="text-sm text-muted">未配置模型</span>
        </div>
      </UCard>

      <UCard :loading="loading">
        <template #header><h3 class="font-bold">近 24 小时趋势</h3></template>
        <div class="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          <div v-for="item in (stats.trend || [])" :key="item.time" class="rounded bg-muted p-2">
            <p class="truncate">{{ item.time }}</p>
            <p class="font-mono">{{ item.requests }} req</p>
            <p class="text-muted">{{ item.avgLatency }}ms</p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
