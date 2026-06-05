<script setup lang="ts">
const { getMcpMarketplace, installMcpPreset } = useAigateApi()
const { successToast } = useAppToast()
const router = useRouter()

const { data, pending: loading, refresh } = await useAsyncData('mcp-marketplace-presets', async () => {
  const res = await getMcpMarketplace()
  return res.data ?? []
})
const presets = computed(() => data.value || [])
const searchQuery = ref('')
const installing = ref<string | null>(null)

const filteredPresets = computed(() => {
  if (!searchQuery.value) return presets.value
  const q = searchQuery.value.toLowerCase()
  return presets.value.filter((t: any) =>
    t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.vendor?.toLowerCase().includes(q),
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
    successToast('安装成功')
    router.push('/aigate/mcp-tools')
  }
  finally { installing.value = null }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-bold">MCP 工具市场</h2>
        <p class="text-sm text-muted">从预设目录一键安装 MCP 工具</p>
      </div>
      <UInput v-model="searchQuery" placeholder="搜索工具..." icon="lucide:search" class="w-64" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="tool in filteredPresets" :key="tool.id">
        <div class="flex items-start gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UIcon :name="categoryIcons[tool.category] || categoryIcons.default" class="text-primary text-lg" />
          </div>
          <div class="flex-1">
            <h3 class="font-bold">{{ tool.name }}</h3>
            <p class="text-xs text-muted">{{ tool.vendor }} · {{ tool.type }}</p>
          </div>
        </div>
        <p class="text-sm text-muted mb-4 line-clamp-2">{{ tool.description }}</p>
        <UButton block size="sm" icon="lucide:download" :loading="installing === tool.id" @click="handleInstall(tool.id)">安装</UButton>
      </UCard>
    </div>

    <div v-if="!loading && filteredPresets.length === 0" class="text-center py-12 text-muted">
      <UIcon name="lucide:package-open" class="text-4xl mb-2" />
      <p>暂无匹配的工具</p>
    </div>
  </div>
</template>
