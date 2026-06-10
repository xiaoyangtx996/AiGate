<script setup lang="ts">
interface McpVersion {
  id: string
  version: string
  active?: boolean
  changelog?: string | null
  createdAt: string
}

interface McpToolRow {
  id: string
  name: string
  description?: string | null
  type: string
  status: string
  healthStatus?: string | null
  usageCount?: number | null
  lastHealthCheck?: string | null
  config?: { endpoint?: string } | null
  versions?: McpVersion[]
}

const { getMcpToolList } = useAigateApi()
const { t } = useI18n()

const { data, pending: loading } = await useAsyncData('aigate-mcp-tool-versions', async () => {
  const res = await getMcpToolList()
  const payload = res.data
  return (Array.isArray(payload) ? payload : payload?.items ?? []) as McpToolRow[]
})

const tools = computed(() => data.value || [])
const selectedTool = ref<McpToolRow | null>(null)
const versions = computed(() => selectedTool.value?.versions || [])

function selectTool(tool: McpToolRow) {
  selectedTool.value = tool
}

const statusColor: Record<string, 'success' | 'neutral'> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, 'success' | 'warning' | 'error'> = { healthy: 'success', degraded: 'warning', down: 'error' }

const p = (key: string) => t(`pages.aigate.mcpTools.versions.${key}`)
</script>

<template>
  <div class="flex gap-4 h-[calc(100vh-120px)]">
    <div class="w-80 shrink-0 space-y-2 overflow-y-auto">
      <h3 class="text-lg font-bold mb-3">
        {{ p('title') }}
      </h3>
      <TableSkeleton v-if="loading" :cols="1" :rows="5" />
      <EmptyState
        v-else-if="tools.length === 0"
        icon="lucide:puzzle"
        :title="p('emptyTools')"
        :description="p('emptyToolsDesc')"
      />
      <UCard
        v-for="tool in tools" v-else :key="tool.id"
        :class="selectedTool?.id === tool.id ? 'border-primary' : 'cursor-pointer hover:border-primary/50'"
        @click="selectTool(tool)"
      >
        <div class="flex items-center gap-2">
          <UIcon name="lucide:puzzle" class="text-primary" />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">
              {{ tool.name }}
            </p>
            <p class="text-xs text-muted">
              {{ tool.type }}
            </p>
          </div>
          <UBadge :color="statusColor[tool.status] || 'neutral'" variant="subtle" size="xs">
            {{ tool.status }}
          </UBadge>
        </div>
      </UCard>
    </div>

    <div class="flex-1 overflow-y-auto">
      <template v-if="selectedTool">
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">
                {{ selectedTool.name }}
              </h3>
              <div class="flex gap-2">
                <UBadge :color="statusColor[selectedTool.status] || 'neutral'" variant="subtle">
                  {{ selectedTool.status }}
                </UBadge>
                <UBadge :color="healthColor[selectedTool.healthStatus || 'healthy'] || 'neutral'" variant="subtle">
                  {{ selectedTool.healthStatus || 'unknown' }}
                </UBadge>
              </div>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><span class="text-muted">{{ p('type') }}：</span>{{ selectedTool.type }}</div>
            <div><span class="text-muted">{{ p('calls') }}：</span>{{ selectedTool.usageCount || 0 }}</div>
            <div><span class="text-muted">{{ p('endpoint') }}：</span><code class="text-xs">{{ selectedTool.config?.endpoint || '-' }}</code></div>
            <div><span class="text-muted">{{ p('lastCheck') }}：</span>{{ selectedTool.lastHealthCheck ? new Date(selectedTool.lastHealthCheck).toLocaleString() : '-' }}</div>
          </div>
          <p v-if="selectedTool.description" class="text-sm text-muted mt-3">
            {{ selectedTool.description }}
          </p>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-bold">
              {{ p('history') }}
            </h3>
          </template>
          <div v-if="versions.length > 0" class="space-y-3">
            <div v-for="ver in versions" :key="ver.id" class="flex items-center gap-3 p-3 rounded-lg border">
              <UIcon :name="ver.active ? 'lucide:check-circle' : 'lucide:git-commit'" :class="ver.active ? 'text-success' : 'text-muted'" />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold">{{ ver.version }}</span>
                  <UBadge v-if="ver.active" color="success" variant="subtle" size="xs">
                    {{ p('current') }}
                  </UBadge>
                </div>
                <p v-if="ver.changelog" class="text-xs text-muted mt-1">
                  {{ ver.changelog }}
                </p>
              </div>
              <span class="text-xs text-muted">{{ new Date(ver.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
          <EmptyState
            v-else
            icon="lucide:git-branch"
            :title="p('emptyVersions')"
            :description="p('emptyVersionsDesc')"
          />
        </UCard>
      </template>

      <EmptyState
        v-else
        icon="lucide:puzzle"
        :title="p('selectTool')"
        :description="p('selectToolDesc')"
        class="h-full flex items-center justify-center"
      />
    </div>
  </div>
</template>
