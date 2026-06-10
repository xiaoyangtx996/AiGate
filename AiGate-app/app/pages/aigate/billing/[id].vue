<script setup lang="ts">
const route = useRoute()
const { getBillingDetail } = useAigateApi()
const { t } = useI18n()
const id = computed(() => route.params.id as string)

const p = (key: string) => t(`pages.aigate.billing.detail.${key}`)
const b = (key: string) => t(`pages.aigate.billing.${key}`)

const { data, pending: loading } = await useAsyncData(
  () => `billing-${id.value}`,
  async () => {
    const res = await getBillingDetail(id.value)
    return res.data
  },
  { watch: [id] },
)

function formatCost(cents: number) {
  return `¥${((cents || 0) / 100).toFixed(2)}`
}

function formatTokens(n: number) {
  return n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0)
}

function exportCsv() {
  if (!data.value)
    return
  const rows = [
    [p('model'), p('requests'), p('tokens'), p('costCents')],
    ...(data.value.modelBreakdown || []).map((m: { model: string, requests: number, tokens: number, cost: number }) => [m.model, m.requests, m.tokens, m.cost]),
  ]
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `billing-${data.value.period}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/billing" />
        <div>
          <h2 class="text-xl font-bold">
            {{ p('title') }}
          </h2>
          <p class="text-sm text-muted">
            {{ data?.organizationName }} · {{ data?.period }}
          </p>
        </div>
      </div>
      <UButton icon="lucide:download" variant="outline" @click="exportCsv">
        {{ p('exportCsv') }}
      </UButton>
    </div>

    <div v-if="loading" class="text-center py-12">
      {{ p('loading') }}
    </div>
    <template v-else-if="data">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <UCard>
          <p class="text-sm text-muted">
            {{ b('tokenUsage') }}
          </p><p class="text-2xl font-bold">
            {{ formatTokens(data.tokenUsage) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ b('cost') }}
          </p><p class="text-2xl font-bold text-primary">
            {{ formatCost(data.cost) }}
          </p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ b('status') }}
          </p><UBadge variant="subtle">
            {{ data.status }}
          </UBadge>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">
            {{ b('dueDate') }}
          </p><p class="font-bold">
            {{ data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '-' }}
          </p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h3 class="font-bold">
            {{ p('modelBreakdown') }}
          </h3>
        </template>
        <UTable
          :data="data.modelBreakdown || []" :columns="[
            { accessorKey: 'model', header: p('model') },
            { accessorKey: 'requests', header: p('requests') },
            { accessorKey: 'tokens', header: p('tokens') },
            { accessorKey: 'cost', header: p('costCents') },
          ]"
        >
          <template #tokens-cell="{ row }">
            {{ formatTokens(row.original.tokens) }}
          </template>
          <template #cost-cell="{ row }">
            {{ formatCost(row.original.cost) }}
          </template>
        </UTable>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-bold">
            {{ p('dailyBreakdown') }}
          </h3>
        </template>
        <UTable
          :data="data.dailyBreakdown || []" :columns="[
            { accessorKey: 'date', header: p('date') },
            { accessorKey: 'requests', header: p('requests') },
            { accessorKey: 'tokens', header: p('tokens') },
            { accessorKey: 'cost', header: p('costCents') },
          ]"
        >
          <template #tokens-cell="{ row }">
            {{ formatTokens(row.original.tokens) }}
          </template>
          <template #cost-cell="{ row }">
            {{ formatCost(row.original.cost) }}
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>
