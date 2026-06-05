<script setup lang="ts">
interface AlertRuleRow {
  id: string
  name: string
  type: string
  enabled: boolean
  condition?: { threshold?: number } | null
}

const { getAlertRules, insertAlertRule, updateAlertRule, delAlertRule } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const { data, pending: loading, refresh } = await useAsyncData('alert-rules', async () => {
  const res = await getAlertRules()
  return (res.data ?? []) as AlertRuleRow[]
})
const list = computed(() => data.value || [])

const open = ref(false)
const editData = ref<AlertRuleRow | null>(null)
const saveLoading = ref(false)
const form = reactive({
  name: '',
  type: 'quota_warning',
  enabled: true,
  threshold: 90,
})

const typeOptions = computed(() => [
  { label: p('types.quota_warning'), value: 'quota_warning' },
  { label: p('types.key_expiring'), value: 'key_expiring' },
  { label: p('types.error_spike'), value: 'error_spike' },
  { label: p('types.rate_limit'), value: 'rate_limit' },
])

function handleAdd() {
  editData.value = null
  form.name = ''
  form.type = 'quota_warning'
  form.enabled = true
  form.threshold = 90
  open.value = true
}

function handleEdit(row: AlertRuleRow) {
  editData.value = row
  form.name = row.name
  form.type = row.type
  form.enabled = row.enabled
  form.threshold = row.condition?.threshold ?? 90
  open.value = true
}

async function handleDelete(id: string) {
  if (!confirm(p('confirmDelete'))) return
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

const p = (key: string) => t(`pages.aigate.alertRules.${key}`)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/alerts" />
        <h2 class="text-xl font-bold">{{ p('title') }}</h2>
      </div>
      <UButton icon="lucide:plus" @click="handleAdd">{{ p('add') }}</UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="4" :rows="5" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:bell-ring"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable v-else :data="list" :columns="[
      { accessorKey: 'name', header: p('ruleName') },
      { accessorKey: 'type', header: p('type') },
      { accessorKey: 'enabled', header: p('status') },
      { id: 'actions', header: $t('common.action') },
    ]">
      <template #type-cell="{ row }">
        {{ p(`types.${row.original.type}`) }}
      </template>
      <template #enabled-cell="{ row }">
        <UBadge :color="row.original.enabled ? 'success' : 'neutral'" variant="subtle">
          {{ row.original.enabled ? p('enabled') : p('disabled') }}
        </UBadge>
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
        <h3 class="font-bold">{{ editData ? p('editTitle') : p('createTitle') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('ruleName')" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField :label="p('type')">
            <USelect v-model="form.type" :items="typeOptions" />
          </UFormField>
          <UFormField :label="p('threshold')">
            <UInput v-model.number="form.threshold" type="number" />
          </UFormField>
          <UFormField :label="p('enabled')">
            <USwitch v-model="form.enabled" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saveLoading" @click="handleSubmit">{{ $t('common.save') }}</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
