<script setup lang="ts">
import HeaderContent from './components/HeaderContent.vue'

interface ApiKeyRow {
  id: string
  name: string
  key: string
  env?: string | null
  status: string
  calls?: number | null
  cost?: number | null
  lastUsed?: string | null
  roleIds?: string[] | null
}

const { getApiKeyList, insertApiKey, updateApiKey, delApiKey } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const { i18nCommon } = useMessage()
const { exportToCSV } = useExport()
const confirm = useConfirmDialog()

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
  'aigate-api-keys',
  async () => {
    const res = await getApiKeyList({ keyword: keyword.value, page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)

const list = computed(() => (data.value?.items ?? []) as ApiKeyRow[])
const total = computed(() => data.value?.total ?? 0)
const listIds = computed(() => list.value.map(item => item.id))

const {
  selectedCount,
  hasSelection,
  isSelected,
  toggleSelect,
  toggleSelectAll,
  isAllSelected,
  isSomeSelected,
  batchDelete,
} = useBatchOperations<ApiKeyRow>({
  onDelete: async (items) => {
    await Promise.all(items.map(item => delApiKey(item.id)))
    refresh()
  },
})

const stats = computed(() => {
  const items = list.value
  return {
    total: total.value,
    active: items.filter(item => item.status === 'active').length,
    calls: items.reduce((sum, item) => sum + (item.calls || 0), 0),
    cost: items.reduce((sum, item) => sum + (item.cost || 0), 0),
  }
})
const open = ref(false)
const editData = ref<ApiKeyRow | null>(null)
const saveLoading = ref(false)

const roles = ref<Array<{ id: string, name: string }>>([])
const form = reactive({
  name: '',
  env: 'production',
  status: 'active',
  roleIds: [] as string[],
})

onMounted(async () => {
  try {
    const res = await $fetch<{ data?: Array<{ id: string, name: string }> }>('/api/aigate/role')
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

function handleEdit(row: ApiKeyRow) {
  editData.value = row
  form.name = row.name || ''
  form.env = row.env || 'production'
  form.status = row.status || 'active'
  form.roleIds = row.roleIds || []
  open.value = true
}

async function handleDelete(id: string) {
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delApiKey(id)
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
    if (editData.value?.id) {
      await updateApiKey({ ...form, id: editData.value.id })
    }
    else {
      await insertApiKey(form)
    }
    successToast()
    open.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
}

function handleExport() {
  exportToCSV(
    list.value.map(item => ({
      name: item.name,
      key: item.key,
      env: item.env,
      status: item.status,
      calls: item.calls,
      cost: item.cost,
      lastUsed: item.lastUsed,
    })),
    'api-keys-export',
  )
}

function maskKey(key: string) {
  if (!key)
    return '-'
  return key.length > 16 ? `${key.substring(0, 12)}...${key.substring(key.length - 4)}` : key
}

function formatCost(cents?: number | null) {
  return `¥${((cents || 0) / 100).toFixed(2)}`
}

function formatLastUsed(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

const statusColor: Record<string, 'success' | 'error' | 'neutral'> = { active: 'success', revoked: 'error', expired: 'neutral' }

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
    <HeaderContent
      v-model="keyword"
      :loading
      :refresh="() => { page = 1; refresh() }"
      :handle-add
      :handle-export
      @keyup.enter="() => { page = 1; refresh() }"
    />
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <p class="text-sm text-muted">
          {{ p('totalKeys') }}
        </p>
        <p class="text-2xl font-bold">
          {{ stats.total }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          {{ p('activeKeys') }}
        </p>
        <p class="text-2xl font-bold text-success">
          {{ stats.active }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          {{ p('totalCalls') }}
        </p>
        <p class="text-2xl font-bold">
          {{ stats.calls.toLocaleString() }}
        </p>
      </UCard>
      <UCard>
        <p class="text-sm text-muted">
          {{ p('totalCost') }}
        </p>
        <p class="text-2xl font-bold">
          {{ formatCost(stats.cost) }}
        </p>
      </UCard>
    </div>

    <TableSkeleton v-if="loading" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:key"
      :title="p('emptyTitle')"
      :description="p('emptyDescription')"
    />
    <UTable
      v-else
      :data="list"
      :columns="[
        { accessorKey: 'select', header: '' },
        { accessorKey: 'name', header: p('name') },
        { accessorKey: 'key', header: p('key') },
        { accessorKey: 'env', header: p('env') },
        { accessorKey: 'status', header: p('status') },
        { accessorKey: 'calls', header: p('calls') },
        { accessorKey: 'cost', header: p('cost') },
        { accessorKey: 'lastUsed', header: p('lastUsed') },
        { accessorKey: 'actions', header: $t('common.action') },
      ]"
    >
      <template #select-header>
        <UCheckbox
          :model-value="isSomeSelected(listIds) ? 'indeterminate' : isAllSelected(listIds)"
          :aria-label="$t('common.selectAll')"
          @update:model-value="toggleSelectAll(listIds)"
        />
      </template>
      <template #select-cell="{ row }">
        <UCheckbox
          :model-value="isSelected(row.original.id)"
          @update:model-value="toggleSelect(row.original.id)"
        />
      </template>
      <template #key-cell="{ row }">
        <code class="text-xs font-mono">{{ maskKey(row.original.key) }}</code>
      </template>
      <template #status-cell="{ row }">
        <UBadge :color="statusColor[row.original.status] || 'neutral'" variant="subtle" size="sm">
          {{ row.original.status }}
        </UBadge>
      </template>
      <template #calls-cell="{ row }">
        <span class="font-mono">{{ (row.original.calls || 0).toLocaleString() }}</span>
      </template>
      <template #cost-cell="{ row }">
        <span class="font-mono">{{ formatCost(row.original.cost) }}</span>
      </template>
      <template #lastUsed-cell="{ row }">
        <span class="text-sm text-muted">{{ formatLastUsed(row.original.lastUsed) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(row.original)" />
          <UButton v-permission="'DELETE'" size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(row.original.id)" />
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
          v-permission="'BATCH_DELETE'"
          size="sm"
          color="error"
          variant="soft"
          icon="lucide:trash-2"
          @click="batchDelete(list)"
        >
          {{ $t('common.batchDelete') }}
        </UButton>
      </div>
    </Transition>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ editData ? $t('common.save') : p('add') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('env')">
            <USelect
              v-model="form.env" :items="[
                { label: p('envProduction'), value: 'production' },
                { label: p('envTest'), value: 'test' },
                { label: p('envDev'), value: 'dev' },
              ]"
            />
          </UFormField>
          <UFormField :label="p('status')">
            <USelect
              v-model="form.status" :items="[
                { label: p('statusActive'), value: 'active' },
                { label: p('statusRevoked'), value: 'revoked' },
                { label: p('statusExpired'), value: 'expired' },
              ]"
            />
          </UFormField>
          <UFormField :label="p('bindRoles')" :hint="p('bindRolesHint')">
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
          <UButton variant="ghost" @click="open = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton v-permission="editData ? 'EDIT' : 'ADD'" :loading="saveLoading" :disabled="!form.name" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
