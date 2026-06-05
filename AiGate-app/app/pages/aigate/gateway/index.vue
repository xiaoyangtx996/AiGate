<script setup lang="ts">
const { getGatewayOverview } = useAigateApi()

const { data, pending: loading, refresh } = await useAsyncData('gateway-overview', async () => {
  const res = await getGatewayOverview()
  return res.data || {}
})

const overview = computed(() => data.value?.overview || {})
const channels = computed(() => data.value?.channels || [])
const recentLogs = computed(() => data.value?.recentLogs || [])

const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">Gateway 概览</h2>
        <p class="text-sm text-muted">API 网关实时状态与路由负载</p>
      </div>
      <div class="flex gap-2">
        <UButton icon="lucide:route" variant="outline" to="/aigate/gateway/routes">路由规则</UButton>
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="refresh()" />
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard><p class="text-sm text-muted">活跃 API Key</p><p class="text-2xl font-bold">{{ overview.activeKeys }}/{{ overview.totalKeys }}</p></UCard>
      <UCard><p class="text-sm text-muted">健康渠道</p><p class="text-2xl font-bold text-success">{{ overview.healthyChannels }}/{{ overview.activeChannels }}</p></UCard>
      <UCard><p class="text-sm text-muted">近 1 小时请求</p><p class="text-2xl font-bold">{{ overview.requestsLastHour || 0 }}</p></UCard>
      <UCard><p class="text-sm text-muted">平均延迟</p><p class="text-2xl font-bold">{{ overview.avgLatency || 0 }}ms</p></UCard>
    </div>

    <UCard>
      <template #header><h3 class="font-bold">渠道路由</h3></template>
      <UTable :loading="loading" :data="channels" :columns="[
        { accessorKey: 'name', header: '名称' },
        { accessorKey: 'vendor', header: '厂商' },
        { accessorKey: 'status', header: '状态' },
        { accessorKey: 'health', header: '健康' },
        { accessorKey: 'priority', header: '优先级' },
      ]">
        <template #health-cell="{ row }">
          <UBadge :color="healthColor[row.original.health] as any" variant="subtle">{{ row.original.health }}</UBadge>
        </template>
        <template #name-cell="{ row }">
          <NuxtLink :to="`/aigate/channels/${row.original.id}`" class="text-primary hover:underline">{{ row.original.name }}</NuxtLink>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <template #header><h3 class="font-bold">最近请求</h3></template>
      <UTable :data="recentLogs" :columns="[
        { accessorKey: 'model', header: '模型' },
        { accessorKey: 'status', header: '状态' },
        { accessorKey: 'latency', header: '延迟(ms)' },
        { accessorKey: 'totalTokens', header: 'Token' },
        { accessorKey: 'createdAt', header: '时间' },
      ]">
        <template #createdAt-cell="{ row }">{{ new Date(row.original.createdAt).toLocaleString() }}</template>
      </UTable>
    </UCard>
  </div>
</template>
