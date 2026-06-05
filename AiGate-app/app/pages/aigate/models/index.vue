<script setup lang="ts">
const { getModelList } = useAigateApi()
const { t } = useI18n()

const keyword = ref('')
const { data, pending: loading } = await useAsyncData('aigate-models', async () => {
  const res = await getModelList({ keyword: keyword.value })
  return res.data ?? []
})
const list = computed(() => data.value || [])
const statusColor: Record<string, string> = { available: 'success', deprecated: 'neutral', maintenance: 'warning' }

const p = (key: string) => t(`pages.aigate.models.${key}`)
</script>

<template>
  <div class="space-y-4">
    <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" />
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="model in list" :key="model.id" class="hover:border-primary transition-colors">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-bold">{{ model.name }}</h3>
            <p class="text-sm text-muted">{{ model.provider }}</p>
          </div>
          <UBadge :color="statusColor[model.status] as any" variant="subtle" size="sm">{{ model.status }}</UBadge>
        </div>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-muted">{{ p('type') }}</span><span>{{ model.type }}</span></div>
          <div class="flex justify-between"><span class="text-muted">{{ p('context') }}</span><span class="font-mono">{{ model.contextWindow?.toLocaleString() }} tokens</span></div>
          <div class="flex justify-between"><span class="text-muted">{{ p('inputPrice') }}</span><span class="font-mono">${{ model.inputPrice }}/1K</span></div>
          <div class="flex justify-between"><span class="text-muted">{{ p('outputPrice') }}</span><span class="font-mono">${{ model.outputPrice }}/1K</span></div>
        </div>
        <div class="flex flex-wrap gap-1 mt-3">
          <UBadge v-for="f in (model.features || [])" :key="f" variant="outline" size="xs">{{ f }}</UBadge>
        </div>
      </UCard>
    </div>
  </div>
</template>
