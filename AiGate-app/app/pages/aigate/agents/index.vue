<script setup lang="ts">
const { getAgentList, delAgent } = useAigateApi()
const { successToast } = useAppToast()
const router = useRouter()
const { data, pending: loading, refresh } = await useAsyncData('aigate-agents', async () => {
  const res = await getAgentList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
async function handleDelete(id: string) { await delAgent(id); successToast(); refresh() }
const statusColor: Record<string, string> = { active: 'success', inactive: 'neutral', archived: 'warning' }
function editAgent(row: any) {
  return router.push(`/aigate/agents/edit/${row.id}`)
}

function chatWithAgent(row: any) {
  return router.push({ path: '/aigate/agents/chat', query: { agentId: row.id } })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Agent 引擎</h2>
      <UButton icon="lucide:plus" to="/aigate/agents/create">编排 Agent</UButton>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard v-for="agent in list" :key="agent.id" :class="agent.builtin ? 'border-primary' : ''">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="text-lg font-bold flex items-center gap-2">
              {{ agent.name }}
              <UBadge v-if="agent.builtin" color="primary" variant="solid" size="xs">内置</UBadge>
            </h3>
            <p class="text-sm text-muted mt-1">{{ agent.description }}</p>
          </div>
          <UBadge :color="statusColor[agent.status] as any" variant="subtle" size="sm">
            {{ agent.status === 'active' ? '运行中' : '草稿' }}
          </UBadge>
        </div>
        <div class="flex flex-wrap gap-1 mb-3">
          <UBadge v-for="tag in (agent.tags || [])" :key="tag" variant="outline" size="xs">{{ tag }}</UBadge>
        </div>
        <div class="flex gap-2">
          <UButton size="sm" variant="outline" class="flex-1" icon="lucide:message-square" @click="chatWithAgent(agent)">对话体验</UButton>
          <UButton size="sm" variant="outline" icon="lucide:edit" @click="editAgent(agent)" />
          <UButton size="sm" variant="ghost" icon="lucide:file-text" :to="`/aigate/agents/${agent.id}/logs`" />
        </div>
      </UCard>
    </div>
  </div>
</template>
