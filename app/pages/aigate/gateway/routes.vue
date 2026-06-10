<script setup lang="ts">
interface ChannelRoute {
  id: string
  name: string
  vendor: string
  endpoint: string
  priority: number
  weight: number
  status: string
  health: string
  models?: string[]
}

const { getChannelList } = useAigateApi()
const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.gateway.${key}`)

const { data, pending: loading } = await useAsyncData('gateway-routes', async () => {
  const res = await getChannelList()
  return (res.data?.items ?? []) as ChannelRoute[]
})

const routes = computed(() =>
  (data.value || []).map(c => ({
    id: c.id,
    name: c.name,
    vendor: c.vendor,
    endpoint: c.endpoint,
    priority: c.priority ?? 100,
    weight: c.weight ?? 1,
    status: c.status,
    health: c.health,
    models: (c.models || []).join(', ') || p('allModels'),
  })),
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/gateway" />
      <div>
        <h2 class="text-xl font-bold">
          {{ p('routesTitle') }}
        </h2>
        <p class="text-sm text-muted">
          {{ p('routesSubtitle') }}
        </p>
      </div>
    </div>

    <UCard>
      <TableSkeleton v-if="loading" :cols="6" :rows="5" />
      <EmptyState
        v-else-if="routes.length === 0"
        icon="lucide:route"
        :title="$t('common.noData')"
        :description="p('routesSubtitle')"
      />
      <UTable
        v-else
        :data="routes"
        :columns="[
          { accessorKey: 'name', header: p('routesChannel') },
          { accessorKey: 'vendor', header: p('vendor') },
          { accessorKey: 'models', header: p('routesModels') },
          { accessorKey: 'priority', header: p('priority') },
          { accessorKey: 'weight', header: p('routesWeight') },
          { accessorKey: 'status', header: p('status') },
          { accessorKey: 'health', header: p('health') },
        ]"
      >
        <template #name-cell="{ row }">
          <NuxtLink :to="`/aigate/channels/${row.original.id}`" class="text-primary hover:underline">
            {{ row.original.name }}
          </NuxtLink>
        </template>
      </UTable>
    </UCard>

    <UAlert icon="lucide:info" color="info" :title="p('routesPolicyTitle')" :description="p('routesPolicyDesc')" />
  </div>
</template>
