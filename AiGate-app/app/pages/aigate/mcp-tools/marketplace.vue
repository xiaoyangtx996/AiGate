<script setup lang="ts">
interface McpPreset {
  id: string
  name: string
  description?: string | null
  vendor?: string | null
  type: string
  category?: string | null
}

const { getMcpMarketplace, installMcpPreset } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const router = useRouter()
const p = (key: string) => t(`pages.aigate.mcpTools.marketplace.${key}`)

const { data, pending: loading } = await useAsyncData('mcp-marketplace-presets', async () => {
  const res = await getMcpMarketplace()
  return (res.data ?? []) as McpPreset[]
})
const presets = computed(() => data.value || [])
const searchQuery = ref('')
const installing = ref<string | null>(null)

const filteredPresets = computed(() => {
  if (!searchQuery.value)
    return presets.value
  const q = searchQuery.value.toLowerCase()
  return presets.value.filter(tool =>
    tool.name?.toLowerCase().includes(q)
    || tool.description?.toLowerCase().includes(q)
    || tool.vendor?.toLowerCase().includes(q),
  )
})

const categoryIcons: Record<string, string> = {
  dev: 'lucide:code',
  database: 'lucide:database',
  search: 'lucide:search',
  communication: 'lucide:message-circle',
  storage: 'lucide:hard-drive',
  automation: 'lucide:bot',
  utility: 'lucide:wrench',
  default: 'lucide:puzzle',
}

async function handleInstall(presetId: string) {
  installing.value = presetId
  try {
    await installMcpPreset(presetId)
    successToast(p('installDone'))
    router.push('/aigate/mcp-tools')
  }
  finally { installing.value = null }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">
          {{ p('title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ p('subtitle') }}
        </p>
      </div>
      <UInput v-model="searchQuery" :placeholder="p('search')" icon="lucide:search" class="w-64" />
    </div>

    <AgentCardSkeleton v-if="loading" :count="6" />
    <EmptyState
      v-else-if="filteredPresets.length === 0"
      icon="lucide:package-open"
      :title="presets.length === 0 ? p('emptyTitle') : p('noMatch')"
      :description="presets.length === 0 ? p('emptyDescription') : p('noMatchDesc')"
    />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="tool in filteredPresets" :key="tool.id">
        <div class="flex items-start gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UIcon :name="categoryIcons[tool.category || 'default'] || categoryIcons.default" class="text-primary text-lg" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold">
              {{ tool.name }}
            </h3>
            <p class="text-xs text-muted">
              {{ tool.vendor }} · {{ tool.type }}
            </p>
          </div>
        </div>
        <p class="text-sm text-muted mb-4 line-clamp-2">
          {{ tool.description }}
        </p>
        <UButton block size="sm" icon="lucide:download" :loading="installing === tool.id" @click="handleInstall(tool.id)">
          {{ p('install') }}
        </UButton>
      </UCard>
    </div>
  </div>
</template>
