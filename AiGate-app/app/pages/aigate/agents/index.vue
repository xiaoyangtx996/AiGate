<script setup lang="ts">
interface AgentRow {
  id: string
  name: string
  description?: string
  status: string
  builtin?: boolean
  tags?: string[]
}

const { getAgentList, delAgent } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const router = useRouter()

const page = ref(1)
const pageSize = ref(12)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-agents',
  async () => {
    const res = await getAgentList({ page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 12 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => (data.value?.items ?? []) as AgentRow[])
const total = computed(() => data.value?.total ?? 0)

const {
  selectedCount,
  hasSelection,
  isSelected,
  toggleSelect,
  batchDelete,
} = useBatchOperations<AgentRow>({
  onDelete: async (items) => {
    await Promise.all(items.map(item => delAgent(item.id)))
    refresh()
  },
})

async function handleDelete(id: string) {
  await delAgent(id)
  successToast()
  refresh()
}

const statusColor: Record<string, 'success' | 'neutral' | 'warning'> = { active: 'success', inactive: 'neutral', archived: 'warning' }

function statusLabel(status: string) {
  return status === 'active' ? p('running') : p('draft')
}

function editAgent(row: AgentRow) {
  return router.push(`/aigate/agents/edit/${row.id}`)
}

function chatWithAgent(row: AgentRow) {
  return router.push({ path: '/aigate/agents/chat', query: { agentId: row.id } })
}

const p = (key: string) => t(`pages.aigate.agents.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">{{ p('title') }}</h2>
      <UButton icon="lucide:plus" to="/aigate/agents/create">{{ p('create') }}</UButton>
    </div>

    <AgentCardSkeleton v-if="loading" />

    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:bot"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    >
      <template #action>
        <UButton icon="lucide:plus" to="/aigate/agents/create">{{ p('create') }}</UButton>
      </template>
    </EmptyState>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UCard v-for="agent in list" :key="agent.id" :class="agent.builtin ? 'border-primary' : ''">
        <div class="relative">
          <div v-if="!agent.builtin" class="absolute top-0 left-0 z-10">
            <UCheckbox
              :model-value="isSelected(agent.id)"
              @update:model-value="toggleSelect(agent.id)"
            />
          </div>
          <div class="flex items-start justify-between mb-3" :class="!agent.builtin ? 'pl-7' : ''">
            <div>
              <h3 class="text-lg font-bold flex items-center gap-2">
                {{ agent.name }}
                <UBadge v-if="agent.builtin" color="primary" variant="solid" size="xs">{{ p('builtin') }}</UBadge>
              </h3>
              <p class="text-sm text-muted mt-1">{{ agent.description }}</p>
            </div>
            <UBadge :color="statusColor[agent.status] || 'neutral'" variant="subtle" size="sm">
              {{ statusLabel(agent.status) }}
            </UBadge>
          </div>
          <div class="flex flex-wrap gap-1 mb-3">
            <UBadge v-for="tag in (agent.tags || [])" :key="tag" variant="outline" size="xs">{{ tag }}</UBadge>
          </div>
          <div class="flex gap-2">
            <UButton size="sm" variant="outline" class="flex-1" icon="lucide:message-square" @click="chatWithAgent(agent)">
              {{ p('chat') }}
            </UButton>
            <UButton size="sm" variant="outline" icon="lucide:edit" @click="editAgent(agent)" />
            <UButton size="sm" variant="ghost" icon="lucide:file-text" :to="`/aigate/agents/${agent.id}/logs`" />
            <UButton
              v-if="!agent.builtin"
              size="sm"
              variant="ghost"
              color="error"
              icon="lucide:trash-2"
              @click="handleDelete(agent.id)"
            />
          </div>
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

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="hasSelection"
        class="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-default bg-default px-5 py-3 shadow-lg"
      >
        <span class="text-sm font-medium">{{ $t('common.selectedCount', { count: selectedCount }) }}</span>
        <UButton
          size="sm"
          color="error"
          variant="soft"
          icon="lucide:trash-2"
          @click="batchDelete(list.filter(item => !item.builtin))"
        >
          {{ $t('common.batchDelete') }}
        </UButton>
      </div>
    </Transition>
  </div>
</template>
