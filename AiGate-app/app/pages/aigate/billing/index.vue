<script setup lang="ts">
const { getBillingList, generateBilling } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-billing',
  async () => {
    const res = await getBillingList({ page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)
const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const generating = ref(false)

async function handleGenerate() {
  generating.value = true
  try {
    await generateBilling()
    successToast(p('generateDone'))
    refresh()
  }
  finally { generating.value = false }
}

const statusColor: Record<string, 'warning' | 'success' | 'error'> = { pending: 'warning', paid: 'success', overdue: 'error' }
function formatCost(cents: number) { return `¥${(cents / 100).toFixed(2)}` }
function formatTokens(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n) }

const p = (key: string) => t(`pages.aigate.billing.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">{{ $t('menu.billing') }}</h2>
      <UButton :loading="generating" icon="lucide:calculator" variant="outline" @click="handleGenerate">{{ p('generate') }}</UButton>
    </div>
    <TableSkeleton v-if="loading" :cols="6" :rows="6" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:receipt"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <template v-else>
      <UTable :data="list" :columns="[
        { accessorKey: 'organizationName', header: p('org') },
        { accessorKey: 'period', header: p('period') },
        { accessorKey: 'tokenUsage', header: p('tokenUsage') },
        { accessorKey: 'cost', header: p('cost') },
        { accessorKey: 'status', header: p('status') },
        { accessorKey: 'dueDate', header: p('dueDate') },
        { id: 'actions', header: '' },
      ]">
        <template #tokenUsage-cell="{ row }">
          <span class="font-mono">{{ formatTokens(row.original.tokenUsage) }}</span>
        </template>
        <template #cost-cell="{ row }">
          <span class="font-mono font-bold">{{ formatCost(row.original.cost) }}</span>
        </template>
        <template #status-cell="{ row }">
          <UBadge :color="statusColor[row.original.status] || 'neutral'" variant="subtle" size="sm">{{ row.original.status }}</UBadge>
        </template>
        <template #dueDate-cell="{ row }">
          {{ row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : '-' }}
        </template>
        <template #actions-cell="{ row }">
          <UButton size="xs" variant="ghost" icon="lucide:eye" :to="`/aigate/billing/${row.original.id}`" />
        </template>
      </UTable>
      <div v-if="total > 0" class="flex justify-end">
        <UPagination
          v-model:page="page"
          :items-per-page="pageSize"
          :total="total"
        />
      </div>
    </template>
  </div>
</template>
