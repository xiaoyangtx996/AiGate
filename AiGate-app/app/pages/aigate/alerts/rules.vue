<script setup lang="ts">
const { getAlertRules, insertAlertRule, updateAlertRule, delAlertRule } = useAigateApi()
const { successToast } = useAppToast()

const { data, pending: loading, refresh } = await useAsyncData('alert-rules', async () => {
  const res = await getAlertRules()
  return res.data ?? []
})
const list = computed(() => data.value || [])

const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)
const form = reactive({
  name: '',
  type: 'quota_warning',
  enabled: true,
  threshold: 90,
})

const typeOptions = [
  { label: '配额预警', value: 'quota_warning' },
  { label: '密钥过期', value: 'key_expiring' },
  { label: '错误激增', value: 'error_spike' },
  { label: '限流告警', value: 'rate_limit' },
]

function handleAdd() {
  editData.value = null
  form.name = ''
  form.type = 'quota_warning'
  form.enabled = true
  form.threshold = 90
  open.value = true
}

function handleEdit(row: any) {
  editData.value = row
  form.name = row.name
  form.type = row.type
  form.enabled = row.enabled
  form.threshold = (row.condition as any)?.threshold ?? 90
  open.value = true
}

async function handleDelete(id: string) {
  if (!confirm('确定删除该规则？')) return
  await delAlertRule(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name) return
  saveLoading.value = true
  try {
    const body = {
      name: form.name,
      type: form.type,
      enabled: form.enabled,
      condition: { threshold: form.threshold },
      notifyChannels: ['in_app'],
    }
    if (editData.value?.id) {
      await updateAlertRule({ id: editData.value.id, ...body })
    } else {
      await insertAlertRule(body)
    }
    successToast()
    open.value = false
    refresh()
  }
  finally { saveLoading.value = false }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/alerts" />
        <h2 class="text-xl font-bold">告警规则</h2>
      </div>
      <UButton icon="lucide:plus" @click="handleAdd">新增规则</UButton>
    </div>

    <UTable :loading="loading" :data="list" :columns="[
      { accessorKey: 'name', header: '规则名称' },
      { accessorKey: 'type', header: '类型' },
      { accessorKey: 'enabled', header: '状态' },
      { id: 'actions', header: '操作' },
    ]">
      <template #enabled-cell="{ row }">
        <UBadge :color="row.original.enabled ? 'success' : 'neutral'" variant="subtle">{{ row.original.enabled ? '启用' : '禁用' }}</UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(row.original)" />
          <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(row.original.id)" />
        </div>
      </template>
    </UTable>

    <UModal v-model:open="open">
      <template #header><h3 class="font-bold">{{ editData ? '编辑规则' : '新增规则' }}</h3></template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="规则名称" required><UInput v-model="form.name" /></UFormField>
          <UFormField label="类型"><USelect v-model="form.type" :items="typeOptions" /></UFormField>
          <UFormField label="阈值 (%)"><UInput v-model.number="form.threshold" type="number" /></UFormField>
          <UFormField label="启用"><USwitch v-model="form.enabled" /></UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">取消</UButton>
          <UButton :loading="saveLoading" @click="handleSubmit">保存</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
