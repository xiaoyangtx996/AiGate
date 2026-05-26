<script setup lang="ts">
const { getBillingList } = useAigateApi()
const { data, pending: loading } = await useAsyncData('aigate-billing', async () => {
  const res = await getBillingList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
const statusColor: Record<string, string> = { pending: 'warning', paid: 'success', overdue: 'error' }
function formatCost(cents: number) { return `¥${(cents / 100).toFixed(2)}` }
function formatTokens(n: number) { return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n) }
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-bold">账单管理</h2>
    <UTable :loading :data="list" :columns="[
      { accessorKey: 'organizationName', header: '组织' },
      { accessorKey: 'period', header: '账期' },
      { accessorKey: 'tokenUsage', header: 'Token 用量' },
      { accessorKey: 'cost', header: '费用' },
      { accessorKey: 'status', header: '状态' },
      { accessorKey: 'dueDate', header: '到期日' },
    ]">
      <template #tokenUsage-cell="{ row }">
        <span class="font-mono">{{ formatTokens(row.original.tokenUsage) }}</span>
      </template>
      <template #cost-cell="{ row }">
        <span class="font-mono font-bold">{{ formatCost(row.original.cost) }}</span>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] as any" variant="subtle" size="sm">{{ row.original.status }}</UBadge>
      </template>
      <template #dueDate-cell="{ row }">
        {{ row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : '-' }}
      </template>
    </UTable>
  </div>
</template>
