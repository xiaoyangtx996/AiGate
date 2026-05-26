<script setup lang="ts">
const { getApiKeyList, insertApiKey, updateApiKey, delApiKey } = useAigateApi()
const { successToast } = useAppToast()

const keyword = ref('')
const { data, pending: loading, refresh } = await useAsyncData('aigate-api-keys', async () => {
  const res = await getApiKeyList({ keyword: keyword.value })
  return res.data ?? []
})
const list = computed(() => data.value || [])
const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)

function handleAdd() { editData.value = null; open.value = true }
function handleEdit(row: any) { editData.value = row; open.value = true }
async function handleDelete(id: string) { await delApiKey(id); successToast(); refresh() }
async function handleSubmit(values: any) {
  saveLoading.value = true
  try {
    if (editData.value?.id) await updateApiKey({ ...values, id: editData.value.id })
    else await insertApiKey(values)
    successToast(); open.value = false; refresh()
  }
  finally { saveLoading.value = false }
}

function maskKey(key: string) { return key.length > 16 ? key.substring(0, 12) + '...' + key.substring(key.length - 4) : key }
const statusColor: Record<string, string> = { active: 'success', revoked: 'error', expired: 'neutral' }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" placeholder="搜索密钥..." icon="lucide:search" @keyup.enter="refresh" />
      <UButton icon="lucide:plus" @click="handleAdd">创建密钥</UButton>
    </div>
    <UTable :loading :data="list" :columns="[
      { accessorKey: 'name', header: '名称' },
      { accessorKey: 'key', header: '密钥' },
      { accessorKey: 'env', header: '环境' },
      { accessorKey: 'status', header: '状态' },
      { accessorKey: 'calls', header: '调用次数' },
      { accessorKey: 'actions', header: '操作' },
    ]">
      <template #key-cell="{ row }">
        <code class="text-xs font-mono">{{ maskKey(row.original.key) }}</code>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] as any" variant="subtle" size="sm">{{ row.original.status }}</UBadge>
      </template>
      <template #calls-cell="{ row }">
        <span class="font-mono">{{ (row.original.calls || 0).toLocaleString() }}</span>
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
