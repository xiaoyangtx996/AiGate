<script setup lang="ts">
import { alertRuleTemplates } from '~~/shared/alert-rule-templates'

interface AlertRuleRow {
  id: string
  name: string
  type: string
  enabled: boolean
  notifyChannels?: string[] | null
  condition?: { threshold?: number, templateId?: string } | null
}

const { getAlertRules, insertAlertRule, updateAlertRule, delAlertRule } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const { i18nCommon } = useMessage()
const confirm = useConfirmDialog()
const p = (key: string) => t(`pages.aigate.alertRules.${key}`)

const { data, pending: loading, refresh } = await useAsyncData('alert-rules', async () => {
  const res = await getAlertRules()
  return (res.data?.items ?? []) as AlertRuleRow[]
})
const list = computed(() => data.value || [])

const open = ref(false)
const editData = ref<AlertRuleRow | null>(null)
const saveLoading = ref(false)
const form = reactive({
  name: '',
  type: 'quota_warning',
  enabled: true,
  templateId: 'quota_90',
  threshold: 90,
  notifyChannels: ['in_app', 'email'] as string[],
})

const templateOptions = computed(() => alertRuleTemplates.map(template => ({
  label: p(`templates.${template.id}`),
  value: template.id,
})))

const typeOptions = computed(() => [
  { label: p('types.quota_warning'), value: 'quota_warning' },
  { label: p('types.key_expiring'), value: 'key_expiring' },
  { label: p('types.error_spike'), value: 'error_spike' },
  { label: p('types.rate_limit'), value: 'rate_limit' },
])
const notifyChannelOptions = computed(() => [
  { label: p('channels.in_app'), value: 'in_app' },
  { label: p('channels.email'), value: 'email' },
])

function applyTemplate(templateId: string) {
  const template = alertRuleTemplates.find(item => item.id === templateId)
  if (!template)
    return

  form.templateId = template.id
  form.type = template.type
  form.threshold = template.threshold
  form.notifyChannels = [...template.notifyChannels]
  if (!editData.value || !form.name) {
    form.name = p(`templates.${template.id}`)
  }
}

function handleAdd() {
  editData.value = null
  form.name = ''
  form.enabled = true
  applyTemplate('quota_90')
  open.value = true
}

function handleEdit(row: AlertRuleRow) {
  editData.value = row
  form.name = row.name
  form.type = row.type
  form.enabled = row.enabled
  form.templateId = row.condition?.templateId || 'quota_90'
  form.threshold = row.condition?.threshold ?? 90
  form.notifyChannels = row.notifyChannels?.length ? [...row.notifyChannels] : ['in_app']
  open.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delAlertRule(id)
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    refresh()
  }
}

async function handleSubmit() {
  if (!form.name)
    return

  saveLoading.value = true
  try {
    const body = {
      name: form.name,
      type: form.type,
      enabled: form.enabled,
      condition: { threshold: form.threshold, templateId: form.templateId },
      notifyChannels: form.notifyChannels,
    }
    if (editData.value?.id) {
      await updateAlertRule({ id: editData.value.id, ...body })
    }
    else {
      await insertAlertRule(body)
    }
    successToast()
    open.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/alerts" />
        <h2 class="text-xl font-bold">
          {{ p('title') }}
        </h2>
      </div>
      <UButton v-permission="'ADD'" icon="lucide:plus" @click="handleAdd">
        {{ p('add') }}
      </UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="4" :rows="5" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:bell-ring"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable
      v-else :data="list" :columns="[
        { accessorKey: 'name', header: p('ruleName') },
        { accessorKey: 'type', header: p('type') },
        { accessorKey: 'enabled', header: p('status') },
        { id: 'actions', header: $t('common.action') },
      ]"
    >
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
          <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(row.original)" />
          <UButton v-permission="'DELETE'" size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(row.original.id)" />
        </div>
      </template>
    </UTable>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="font-bold">
          {{ editData ? p('editTitle') : p('createTitle') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('ruleName')" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField :label="p('template')">
            <USelect v-model="form.templateId" :items="templateOptions" @update:model-value="applyTemplate" />
          </UFormField>
          <UFormField :label="p('type')">
            <USelect v-model="form.type" :items="typeOptions" />
          </UFormField>
          <UFormField :label="p('threshold')">
            <UInput v-model.number="form.threshold" type="number" />
          </UFormField>
          <UFormField :label="p('notifyChannels')">
            <USelectMenu v-model="form.notifyChannels" multiple :items="notifyChannelOptions" value-key="value" />
          </UFormField>
          <UFormField :label="p('enabled')">
            <USwitch v-model="form.enabled" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton v-permission="editData ? 'EDIT' : 'ADD'" :loading="saveLoading" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
