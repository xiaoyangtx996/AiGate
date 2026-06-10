<script setup lang="ts">
const { getModelList } = useAigateApi()
const { t } = useI18n()
type ModelStatusColor = 'success' | 'neutral' | 'warning'

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-models',
  async () => {
    const res = await getModelList({
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const statusColor: Record<string, ModelStatusColor> = { available: 'success', deprecated: 'neutral', maintenance: 'warning' }
const getStatusColor = (status: string): ModelStatusColor => statusColor[status] || 'neutral'

function handleSearch() {
  page.value = 1
  refresh()
}

const p = (key: string) => t(`pages.aigate.models.${key}`)
</script>

<template>
  <div class="space-y-4">
    <h2 class="text-xl font-bold">
      {{ p('title') }}
    </h2>
    <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="handleSearch" />
    <TableSkeleton v-if="loading" :cols="3" :rows="3" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:box"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard v-for="model in list" :key="model.id" class="hover:border-primary transition-colors">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-bold">
                {{ model.name }}
              </h3>
              <p class="text-sm text-muted">
                {{ model.provider }}
              </p>
            </div>
            <UBadge :color="getStatusColor(model.status)" variant="subtle" size="sm">
              {{ model.status }}
            </UBadge>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">{{ p('type') }}</span><span>{{ model.type }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('context') }}</span><span class="font-mono">{{ model.contextWindow?.toLocaleString() }} tokens</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('inputPrice') }}</span><span class="font-mono">${{ model.inputPrice }}/1K</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">{{ p('outputPrice') }}</span><span class="font-mono">${{ model.outputPrice }}/1K</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-1 mt-3">
            <UBadge v-for="f in (model.features || [])" :key="f" variant="outline" size="xs">
              {{ f }}
            </UBadge>
          </div>
        </UCard>
      </div>
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
