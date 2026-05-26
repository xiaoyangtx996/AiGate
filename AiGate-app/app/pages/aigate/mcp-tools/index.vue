<script setup lang="ts">
const { getMcpToolList, insertMcpTool, delMcpTool } = useAigateApi()
const { successToast } = useAppToast()
const keyword = ref('')
const { data, pending: loading, refresh } = await useAsyncData('aigate-mcp-tools', async () => {
  const res = await getMcpToolList({ keyword: keyword.value })
  return res.data ?? []
})
const list = computed(() => data.value || [])
const open = ref(false)
async function handleDelete(id: string) { await delMcpTool(id); successToast(); refresh() }
const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" placeholder="搜索工具..." icon="lucide:search" @keyup.enter="refresh" />
      <UButton icon="lucide:plus" @click="open = true">添加工具</UButton>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="tool in list" :key="tool.id">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-bold">{{ tool.name }}</h3>
            <p class="text-sm text-muted">{{ tool.description }}</p>
          </div>
          <UBadge :color="healthColor[tool.healthStatus || 'healthy'] as any" variant="subtle" size="sm">{{ tool.healthStatus }}</UBadge>
        </div>
        <div class="flex items-center justify-between text-sm">
          <UBadge variant="outline" size="xs">{{ tool.type }}</UBadge>
          <span class="text-muted">{{ tool.usageCount?.toLocaleString() }} 次调用</span>
        </div>
        <div class="flex gap-2 mt-3">
          <UButton size="xs" variant="outline" class="flex-1">配置</UButton>
          <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(tool.id)" />
        </div>
      </UCard>
    </div>
  </div>
</template>
