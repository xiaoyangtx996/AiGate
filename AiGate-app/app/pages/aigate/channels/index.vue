<script setup lang="ts">
const { getChannelList, insertChannel, updateChannel, delChannel, checkChannelHealth } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-channels',
  async () => {
    const res = await getChannelList({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)

const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)
const healthChecking = ref(false)

const form = reactive({
  name: '',
  vendor: '',
  endpoint: '',
  apiKey: '',
  status: 'enabled',
})

function handleAdd() {
  editData.value = null
  form.name = ''
  form.vendor = ''
  form.endpoint = ''
  form.apiKey = ''
  form.status = 'enabled'
  open.value = true
}

function handleEdit(row: any) {
  editData.value = row
  form.name = row.name || ''
  form.vendor = row.vendor || ''
  form.endpoint = row.endpoint || ''
  form.apiKey = ''
  form.status = row.status || 'enabled'
  open.value = true
}

async function handleDelete(id: string) {
  await delChannel(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name || !form.endpoint) return
  saveLoading.value = true
  try {
    const data = { ...form }
    if (editData.value?.id) {
      await updateChannel({ ...data, id: editData.value.id })
    } else {
      await insertChannel(data)
    }
    successToast()
    open.value = false
    refresh()
  } finally {
    saveLoading.value = false
  }
}

const healthCheckResult = ref<any>(null)
const showHealthDetail = ref(false)

async function handleHealthCheck(channelId?: string) {
  healthChecking.value = true
  try {
    const res = await checkChannelHealth(channelId)
    if (res.data?.results) {
      const healthy = res.data.results.filter((r: any) => r.healthy).length
      successToast(`健康检测完成：${healthy}/${res.data.results.length} 正常`)
      healthCheckResult.value = res.data
      showHealthDetail.value = true
    } else if (res.data) {
      successToast(`渠道 ${res.data.name}: ${res.data.healthy ? '正常' : '异常'}`)
      healthCheckResult.value = { results: [res.data] }
      showHealthDetail.value = true
    }
    refresh()
  } finally {
    healthChecking.value = false
  }
}

const statusColor: Record<string, string> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }

const p = (key: string) => t(`pages.aigate.channels.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="() => { page = 1; refresh() }" />
        <UButton :loading="healthChecking" icon="lucide:heart-pulse" variant="outline" size="sm" @click="handleHealthCheck()">{{ p('healthCheck') }}</UButton>
      </div>
      <UButton icon="lucide:plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>

    <UTable :loading :data="list" :columns="[
      { accessorKey: 'name', header: p('name') },
      { accessorKey: 'vendor', header: p('vendor') },
      { accessorKey: 'endpoint', header: p('endpoint') },
      { accessorKey: 'status', header: p('status') },
      { accessorKey: 'health', header: p('health') },
      { accessorKey: 'qps', header: p('qps') },
      { accessorKey: 'actions', header: $t('common.action') },
    ]">
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] as any" variant="subtle" size="sm">{{ row.original.status }}</UBadge>
      </template>
      <template #health-cell="{ row }">
        <UBadge :color="healthColor[row.original.health] as any" variant="subtle" size="sm">{{ row.original.health }}</UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:eye" :to="`/aigate/channels/${row.original.id}`" />
          <UButton size="xs" variant="ghost" icon="lucide:heart-pulse" :loading="healthChecking" @click="handleHealthCheck(row.original.id)" />
          <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(row.original)" />
          <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(row.original.id)" />
        </div>
      </template>
    </UTable>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
      />
    </div>

    <UModal v-model:open="showHealthDetail">
      <template #header>
        <h3 class="text-lg font-bold">健康检查详情</h3>
      </template>
      <template #body>
        <div v-if="healthCheckResult" class="space-y-4">
          <div v-if="healthCheckResult.total !== undefined" class="text-sm text-gray-500">
            总计: {{ healthCheckResult.total }} | 正常: {{ healthCheckResult.healthy }} | 异常: {{ healthCheckResult.unhealthy }}
          </div>
          <div class="space-y-2">
            <div v-for="result in (healthCheckResult.results || [healthCheckResult])" :key="result.channelId"
                 class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-2">
                <div class="font-medium">{{ result.name || 'Unknown Channel' }}</div>
                <UBadge :color="result.healthy ? 'success' : 'error'" variant="subtle">
                  {{ result.healthy ? '正常' : '异常' }}
                </UBadge>
              </div>
              <div class="text-sm space-y-1 text-gray-600">
                <div class="flex justify-between">
                  <span>延迟:</span>
                  <span class="font-mono">{{ result.latency }}ms</span>
                </div>
                <div v-if="result.status" class="flex justify-between">
                  <span>状态码:</span>
                  <span class="font-mono">{{ result.status }}</span>
                </div>
                <div v-if="result.error" class="flex justify-between">
                  <span>错误:</span>
                  <span class="text-red-500 text-xs break-all">{{ result.error }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span>时间:</span>
                  <span>{{ result.timestamp }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton variant="ghost" @click="showHealthDetail = false">关闭</UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">{{ editData ? $t('common.save') : p('add') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" placeholder="如：OpenAI 主渠道" />
          </UFormField>
          <UFormField :label="p('vendor')">
            <USelect v-model="form.vendor" :items="[
              { label: 'OpenAI', value: 'openai' },
              { label: 'Anthropic', value: 'anthropic' },
              { label: 'DeepSeek', value: 'deepseek' },
              { label: '其他', value: 'other' },
            ]" placeholder="选择供应商" />
          </UFormField>
          <UFormField :label="p('endpoint')" required>
            <UInput v-model="form.endpoint" placeholder="https://api.openai.com/v1" />
          </UFormField>
          <UFormField label="API Key">
            <UInput v-model="form.apiKey" type="password" placeholder="sk-..." />
          </UFormField>
          <UFormField :label="p('status')">
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
          <UButton :loading="saveLoading" :disabled="!form.name || !form.endpoint" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
