<script setup lang="ts">
const { getMcpToolList, insertMcpTool, updateMcpTool, delMcpTool, testMcpTool } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const keyword = ref('')
const page = ref(1)
const pageSize = ref(12)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-mcp-tools',
  async () => {
    const res = await getMcpToolList({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 12 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

interface McpToolRow {
  id: string
  name: string
  description?: string
  type: string
  endpoint?: string
  status: string
  healthStatus?: string
  usageCount?: number
}

const open = ref(false)
const editData = ref<McpToolRow | null>(null)
const saveLoading = ref(false)

const form = reactive({
  name: '',
  description: '',
  type: 'sse',
  endpoint: '',
  status: 'enabled',
})

function handleAdd() {
  editData.value = null
  form.name = ''
  form.description = ''
  form.type = 'sse'
  form.endpoint = ''
  form.status = 'enabled'
  open.value = true
}

function handleEdit(row: McpToolRow) {
  editData.value = row
  form.name = row.name || ''
  form.description = row.description || ''
  form.type = row.type || 'sse'
  form.endpoint = row.endpoint || ''
  form.status = row.status || 'enabled'
  open.value = true
}

async function handleDelete(id: string) {
  await delMcpTool(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name) return
  saveLoading.value = true
  try {
    if (editData.value?.id) {
      await updateMcpTool({ ...form, id: editData.value.id })
    } else {
      await insertMcpTool(form)
    }
    successToast()
    open.value = false
    refresh()
  } finally {
    saveLoading.value = false
  }
}

const healthColor: Record<string, 'success' | 'warning' | 'error'> = { healthy: 'success', degraded: 'warning', down: 'error' }
const testingId = ref<string | null>(null)

async function handleTest(tool: McpToolRow) {
  testingId.value = tool.id
  try {
    const res = await testMcpTool({ id: tool.id })
    successToast(
      res.data?.healthy
        ? p('testOk', { latency: res.data.latency })
        : p('testFail', { error: res.data?.error || t('common.requestError') }),
    )
    refresh()
  }
  finally { testingId.value = null }
}

const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.mcpTools.${key}`, params ?? {})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="() => { page = 1; refresh() }" />
      <UButton icon="lucide:plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>
    <AgentCardSkeleton v-if="loading" :count="6" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:wrench"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="tool in list" :key="tool.id" class="hover:border-primary transition-colors">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-bold">{{ tool.name }}</h3>
            <p class="text-sm text-muted">{{ tool.description }}</p>
          </div>
          <UBadge :color="healthColor[tool.healthStatus || 'healthy'] || 'neutral'" variant="subtle" size="sm">{{ tool.healthStatus || 'unknown' }}</UBadge>
        </div>
        <div class="flex items-center justify-between text-sm">
          <UBadge variant="outline" size="xs">{{ tool.type }}</UBadge>
          <span class="text-muted">{{ (tool.usageCount || 0).toLocaleString() }} {{ p('calls') }}</span>
        </div>
        <div class="flex gap-2 mt-3">
          <UButton size="xs" variant="outline" class="flex-1" @click="handleEdit(tool)">{{ p('config') }}</UButton>
          <UButton size="xs" variant="outline" icon="lucide:plug" :loading="testingId === tool.id" @click="handleTest(tool)" />
          <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(tool.id)" />
        </div>
      </UCard>
    </div>

    <div v-if="total > 0 && !loading" class="flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
      />
    </div>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">{{ editData ? $t('common.save') : p('add') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('description')">
            <UInput v-model="form.description" :placeholder="p('descriptionPlaceholder')" />
          </UFormField>
          <UFormField :label="p('type')">
            <USelect v-model="form.type" :items="[
              { label: p('typeSse'), value: 'sse' },
              { label: p('typeStreamable'), value: 'streamable_http' },
              { label: p('typeStdio'), value: 'stdio' },
            ]" />
          </UFormField>
          <UFormField :label="p('endpoint')">
            <UInput v-model="form.endpoint" :placeholder="p('endpointPlaceholder')" />
          </UFormField>
          <UFormField :label="p('status')">
            <USelect v-model="form.status" :items="[
              { label: p('enabled'), value: 'enabled' },
              { label: p('disabled'), value: 'disabled' },
            ]" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saveLoading" :disabled="!form.name" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
