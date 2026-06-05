<script setup lang="ts">
const { getMcpToolList } = useAigateApi()
const { data } = await useAsyncData('aigate-mcp-tools', async () => {
  const res = await getMcpToolList()
  return res.data ?? []
})
const tools = computed(() => data.value || [])
const selectedTool = ref<any>(null)
const versions = ref<any[]>([])

async function selectTool(tool: any) {
  selectedTool.value = tool
  versions.value = (tool as any).versions || []
}

const statusColor: Record<string, string> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }
</script>

<template>
  <div class="flex gap-4 h-[calc(100vh-120px)]">
    <div class="w-80 shrink-0 space-y-2 overflow-y-auto">
      <h3 class="text-lg font-bold mb-3">MCP 工具</h3>
      <UCard
        v-for="tool in tools" :key="tool.id"
        :class="selectedTool?.id === tool.id ? 'border-primary' : 'cursor-pointer hover:border-primary/50'"
        @click="selectTool(tool)"
      >
        <div class="flex items-center gap-2">
          <UIcon name="lucide:puzzle" class="text-primary" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">{{ tool.name }}</p>
            <p class="text-xs text-muted">{{ tool.type }}</p>
          </div>
          <UBadge :color="statusColor[tool.status] as any" variant="subtle" size="xs">{{ tool.status }}</UBadge>
        </div>
      </UCard>
    </div>

    <div class="flex-1 overflow-y-auto">
      <template v-if="selectedTool">
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">{{ selectedTool.name }}</h3>
              <div class="flex gap-2">
                <UBadge :color="statusColor[selectedTool.status] as any" variant="subtle">{{ selectedTool.status }}</UBadge>
                <UBadge :color="healthColor[selectedTool.healthStatus] as any" variant="subtle">{{ selectedTool.healthStatus || 'unknown' }}</UBadge>
              </div>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-muted">类型：</span>{{ selectedTool.type }}</div>
            <div><span class="text-muted">调用次数：</span>{{ selectedTool.usageCount || 0 }}</div>
            <div><span class="text-muted">端点：</span><code class="text-xs">{{ selectedTool.config?.endpoint || '-' }}</code></div>
            <div><span class="text-muted">最后检查：</span>{{ selectedTool.lastHealthCheck ? new Date(selectedTool.lastHealthCheck).toLocaleString() : '-' }}</div>
          </div>
          <p v-if="selectedTool.description" class="text-sm text-muted mt-3">{{ selectedTool.description }}</p>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-bold">版本历史</h3>
          </template>
          <div v-if="versions.length > 0" class="space-y-3">
            <div v-for="ver in versions" :key="ver.id" class="flex items-center gap-3 p-3 rounded-lg border">
              <UIcon :name="ver.active ? 'lucide:check-circle' : 'lucide:git-commit'" :class="ver.active ? 'text-success' : 'text-muted'" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold">{{ ver.version }}</span>
                  <UBadge v-if="ver.active" color="success" variant="subtle" size="xs">当前版本</UBadge>
                </div>
                <p v-if="ver.changelog" class="text-xs text-muted mt-1">{{ ver.changelog }}</p>
              </div>
              <span class="text-xs text-muted">{{ new Date(ver.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
          <div v-else class="text-center py-8 text-muted">
            <UIcon name="lucide:git-branch" class="text-3xl mb-2" />
            <p>暂无版本记录</p>
          </div>
        </UCard>
      </template>

      <div v-else class="flex items-center justify-center h-full text-muted">
        <div class="text-center">
          <UIcon name="lucide:puzzle" class="text-4xl mb-2" />
          <p>选择一个 MCP 工具查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>
