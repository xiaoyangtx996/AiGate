<script setup lang="ts">
const { getGatewayOverview } = useAigateApi()
const { t } = useI18n()

interface GatewayChannel {
  id: string
  name: string
  vendor: string
  status: string
  health: string
  priority?: number
}

const { data, pending: loading, refresh } = await useAsyncData('gateway-overview', async () => {
  const res = await getGatewayOverview()
  return res.data || {}
})

const overview = computed(() => data.value?.overview || {})
const channels = computed<GatewayChannel[]>(() => data.value?.channels as GatewayChannel[] || [])
const recentLogs = computed(() => data.value?.recentLogs || [])

const healthColor: Record<string, 'success' | 'warning' | 'error'> = { healthy: 'success', degraded: 'warning', down: 'error' }

const p = (key: string) => t(`pages.aigate.gateway.${key}`)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">
          {{ p('title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ p('subtitle') }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton icon="lucide:route" variant="outline" to="/aigate/gateway/routes">
          {{ p('routes') }}
        </UButton>
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="refresh()" />
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <p class="text-sm text-muted">
          {{ p('activeKeys') }}
        </p><p class="text-2xl font-bold">
          {{ overview.activeKeys }}/{{ overview.totalKeys }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          {{ p('healthyChannels') }}
        </p><p class="text-2xl font-bold text-success">
          {{ overview.healthyChannels }}/{{ overview.activeChannels }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          {{ p('requestsLastHour') }}
        </p><p class="text-2xl font-bold">
          {{ overview.requestsLastHour || 0 }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          {{ p('avgLatency') }}
        </p><p class="text-2xl font-bold">
          {{ overview.avgLatency || 0 }}ms
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <h3 class="font-bold">
          {{ p('channelRoutes') }}
        </h3>
      </template>
      <TableSkeleton v-if="loading" :cols="5" :rows="4" />
      <EmptyState
        v-else-if="channels.length === 0"
        icon="lucide:route"
        :title="$t('common.noData')"
        :description="p('subtitle')"
      />
      <UTable
        v-else :data="channels" :columns="[
          { accessorKey: 'name', header: p('name') },
          { accessorKey: 'vendor', header: p('vendor') },
          { accessorKey: 'status', header: p('status') },
          { accessorKey: 'health', header: p('health') },
          { accessorKey: 'priority', header: p('priority') },
        ]"
      >
        <template #health-cell="{ row }">
          <UBadge :color="healthColor[row.original.health] || 'neutral'" variant="subtle">
            {{ row.original.health }}
          </UBadge>
        </template>
        <template #name-cell="{ row }">
          <NuxtLink :to="`/aigate/channels/${row.original.id}`" class="text-primary hover:underline">
            {{ row.original.name }}
          </NuxtLink>
        </template>
      </UTable>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="font-bold">
          {{ p('recentLogs') }}
        </h3>
      </template>
      <EmptyState
        v-if="recentLogs.length === 0"
        icon="lucide:scroll-text"
        :title="$t('common.noData')"
        :description="p('subtitle')"
      />
      <UTable
        v-else :data="recentLogs" :columns="[
          { accessorKey: 'model', header: p('model') },
          { accessorKey: 'status', header: p('status') },
          { accessorKey: 'latency', header: p('latency') },
          { accessorKey: 'totalTokens', header: p('tokens') },
          { accessorKey: 'createdAt', header: p('time') },
        ]"
      >
        <template #createdAt-cell="{ row }">
          {{ new Date(row.original.createdAt).toLocaleString() }}
        </template>
      </UTable>
    </UCard>
  </div>
</template>
