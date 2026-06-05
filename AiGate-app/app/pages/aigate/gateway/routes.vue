<script setup lang="ts">
const { getChannelList } = useAigateApi()

const { data, pending: loading } = await useAsyncData('gateway-routes', async () => {
  const res = await getChannelList()
  return res.data ?? []
})

const routes = computed(() => (data.value || []).map((c: any) => ({
  id: c.id,
  name: c.name,
  vendor: c.vendor,
  endpoint: c.endpoint,
  priority: c.priority ?? 100,
  weight: c.weight ?? 1,
  status: c.status,
  health: c.health,
  models: (c.models || []).join(', ') || '全部模型',
})))
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/gateway" />
      <div>
        <h2 class="text-xl font-bold">路由规则</h2>
        <p class="text-sm text-muted">渠道优先级与负载分配策略</p>
      </div>
    </div>

    <UCard>
      <UTable :loading="loading" :data="routes" :columns="[
        { accessorKey: 'name', header: '渠道' },
        { accessorKey: 'vendor', header: '厂商' },
        { accessorKey: 'models', header: '模型范围' },
        { accessorKey: 'priority', header: '优先级' },
        { accessorKey: 'weight', header: '权重' },
        { accessorKey: 'status', header: '状态' },
        { accessorKey: 'health', header: '健康' },
      ]">
        <template #name-cell="{ row }">
          <NuxtLink :to="`/aigate/channels/${row.original.id}`" class="text-primary hover:underline">{{ row.original.name }}</NuxtLink>
        </template>
      </UTable>
    </UCard>

    <UAlert icon="lucide:info" color="info" title="路由策略" description="Gateway 按渠道优先级（数字越小越优先）选择健康渠道转发请求。可在渠道详情页调整优先级和权重。" />
  </div>
</template>
