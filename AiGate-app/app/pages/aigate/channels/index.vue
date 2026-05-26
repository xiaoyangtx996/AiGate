<script setup lang="ts">
const { getChannelList, insertChannel, updateChannel, delChannel } = useAigateApi()
const { successToast } = useAppToast()

const keyword = ref('')
const { data, pending: loading, refresh } = await useAsyncData('aigate-channels', async () => {
  const res = await getChannelList({ keyword: keyword.value })
  return res.data ?? []
})

const list = computed(() => data.value || [])

const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)

function handleAdd() { editData.value = null; open.value = true }
function handleEdit(row: any) { editData.value = row; open.value = true }

async function handleDelete(id: string) {
  await delChannel(id)
  successToast()
  refresh()
}

async function handleSubmit(values: any) {
  saveLoading.value = true
  try {
    if (editData.value?.id) { await updateChannel({ ...values, id: editData.value.id }) }
    else { await insertChannel(values) }
    successToast()
    open.value = false
    refresh()
  }
  finally { saveLoading.value = false }
}

const statusColor: Record<string, string> = { enabled: 'success', disabled: 'neutral' }
const healthColor: Record<string, string> = { healthy: 'success', degraded: 'warning', down: 'error' }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UInput v-model="keyword" placeholder="搜索渠道..." icon="lucide:search" @keyup.enter="refresh" />
      </div>
      <UButton icon="lucide:plus" @click="handleAdd">添加渠道</UButton>
    </div>

    <UTable :loading :data="list" :columns="[
      { accessorKey: 'name', header: '名称' },
      { accessorKey: 'vendor', header: '供应商' },
      { accessorKey: 'endpoint', header: '端点' },
      { accessorKey: 'status', header: '状态' },
      { accessorKey: 'health', header: '健康' },
      { accessorKey: 'qps', header: 'QPS' },
      { accessorKey: 'actions', header: '操作' },
    ]">
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] as any" variant="subtle" size="sm">{{ row.original.status }}</UBadge>
      </template>
      <template #health-cell="{ row }">
        <UBadge :color="healthColor[row.original.health] as any" variant="subtle" size="sm">{{ row.original.health }}</UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(row.original)" />
          <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(row.original.id)" />
        </div>
      </template>
    </UTable>
  </div>
</template>
