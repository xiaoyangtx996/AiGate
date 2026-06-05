<script setup lang="ts">
const { getMcpToolList, insertMcpTool, updateMcpTool, delMcpTool, testMcpTool } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const keyword = ref('')
const { data, pending: loading, refresh } = await useAsyncData('aigate-mcp-tools', async () => {
  const res = await getMcpToolList({ keyword: keyword.value })
  return res.data ?? []
})
const list = computed(() => data.value || [])

const open = ref(false)
const editData = ref<any>(null)
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

function handleEdit(row: any) {
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

const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }
const testingId = ref<string | null>(null)

async function handleTest(tool: any) {
  testingId.value = tool.id
  try {
    const res = await testMcpTool({ id: tool.id })
    successToast(res.data?.healthy ? `连接正常 (${res.data.latency}ms)` : `连接失败: ${res.data?.error || '未知错误'}`)
    refresh()
  }
  finally { testingId.value = null }
}

const p = (key: string) => t(`pages.aigate.mcpTools.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="refresh" />
      <UButton icon="lucide:plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="tool in list" :key="tool.id" class="hover:border-primary transition-colors">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-bold">{{ tool.name }}</h3>
            <p class="text-sm text-muted">{{ tool.description }}</p>
          </div>
          <UBadge :color="healthColor[tool.healthStatus || 'healthy'] as any" variant="subtle" size="sm">{{ tool.healthStatus || 'unknown' }}</UBadge>
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

    <div v-if="list.length === 0 && !loading" class="text-center py-12 text-muted">
      <UIcon name="lucide:wrench" class="text-4xl mb-2" />
      <p>{{ $t('common.noData') }}</p>
    </div>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">{{ editData ? $t('common.save') : p('add') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="form.name" placeholder="如：GitHub MCP" />
          </UFormField>
          <UFormField label="描述">
            <UInput v-model="form.description" placeholder="描述这个工具的用途" />
          </UFormField>
          <UFormField :label="p('type')">
            <USelect v-model="form.type" :items="[
              { label: 'SSE', value: 'sse' },
              { label: 'Streamable HTTP', value: 'streamable_http' },
              { label: 'Stdio', value: 'stdio' },
            ]" />
          </UFormField>
          <UFormField label="端点">
            <UInput v-model="form.endpoint" placeholder="https://mcp.github.com/sse" />
          </UFormField>
          <UFormField label="状态">
            <USelect v-model="form.status" :items="[
              { label: '启用', value: 'enabled' },
              { label: '禁用', value: 'disabled' },
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
