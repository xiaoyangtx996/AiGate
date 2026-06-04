<script setup lang="ts">
const { getApiKeyList, insertApiKey, updateApiKey, delApiKey } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const keyword = ref('')
const { data, pending: loading, refresh } = await useAsyncData('aigate-api-keys', async () => {
  const res = await getApiKeyList({ keyword: keyword.value })
  return res.data ?? []
})
const list = computed(() => data.value || [])
const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)

const roles = ref<Array<{ id: string; name: string }>>([])
const form = reactive({
  name: '',
  env: 'production',
  status: 'active',
  roleIds: [] as string[],
})

// Load roles list
onMounted(async () => {
  try {
    const res = await $fetch<{ data?: Array<{ id: string; name: string }> }>('/api/aigate/role')
    roles.value = res.data || []
  }
  catch {
    roles.value = []
  }
})

function handleAdd() {
  editData.value = null
  form.name = ''
  form.env = 'production'
  form.status = 'active'
  form.roleIds = []
  open.value = true
}

function handleEdit(row: any) {
  editData.value = row
  form.name = row.name || ''
  form.env = row.env || 'production'
  form.status = row.status || 'active'
  form.roleIds = row.roleIds || []
  open.value = true
}

async function handleDelete(id: string) {
  await delApiKey(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name) return
  saveLoading.value = true
  try {
    if (editData.value?.id) {
      await updateApiKey({ ...form, id: editData.value.id })
    } else {
      await insertApiKey(form)
    }
    successToast()
    open.value = false
    refresh()
  } finally {
    saveLoading.value = false
  }
}

function maskKey(key: string) {
  if (!key) return '-'
  return key.length > 16 ? key.substring(0, 12) + '...' + key.substring(key.length - 4) : key
}

const statusColor: Record<string, string> = { active: 'success', revoked: 'error', expired: 'neutral' }

function toggleRole(roleId: string, checked: boolean) {
  if (checked && !form.roleIds.includes(roleId)) {
    form.roleIds.push(roleId)
  }
  if (!checked) {
    form.roleIds = form.roleIds.filter(id => id !== roleId)
  }
}

const p = (key: string) => t(`pages.aigate.apiKeys.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UInput v-model="keyword" :placeholder="p('search')" icon="lucide:search" @keyup.enter="refresh" />
      <UButton icon="lucide:plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>
    <UTable :loading :data="list" :columns="[
      { accessorKey: 'name', header: p('name') },
      { accessorKey: 'key', header: p('key') },
      { accessorKey: 'env', header: p('env') },
      { accessorKey: 'status', header: p('status') },
      { accessorKey: 'calls', header: p('calls') },
      { accessorKey: 'actions', header: $t('common.action') },
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

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">{{ editData ? $t('common.save') : p('add') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" placeholder="如：生产环境 Key" />
          </UFormField>
          <UFormField :label="p('env')">
            <USelect v-model="form.env" :items="[
              { label: '生产环境', value: 'production' },
              { label: '测试环境', value: 'test' },
              { label: '开发环境', value: 'dev' },
            ]" />
          </UFormField>
          <UFormField :label="p('status')">
            <USelect v-model="form.status" :items="[
              { label: '活跃', value: 'active' },
              { label: '已撤销', value: 'revoked' },
              { label: '已过期', value: 'expired' },
            ]" />
          </UFormField>
          <UFormField label="绑定角色">
            <div class="flex flex-wrap gap-2">
              <UCheckbox
                v-for="role in roles"
                :key="role.id"
                :label="role.name"
                :model-value="form.roleIds.includes(role.id)"
                @update:model-value="value => toggleRole(role.id, Boolean(value))"
              />
            </div>
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
