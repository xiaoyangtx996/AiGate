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
  dailyLimit?: number | null
  ipWhitelist?: string[] | null
  expiresAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

interface ApiKeyDetail extends ApiKeyRow {
  usage30d?: Array<{ date: string, calls: number, tokens: number, cost: number }>
  topModels?: Array<{ model: string, calls: number, tokens: number, cost: number }>
  lifecycle?: Array<{ action: string, userId?: string | null, createdAt?: string | null }>
}

const { getApiKeyList, getApiKeyDetail, insertApiKey, updateApiKey, delApiKey } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const { i18nCommon } = useMessage()
const { exportToCSV } = useExport()
const confirm = useConfirmDialog()

const whitespacePattern = /\s+/

const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
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
const detailOpen = ref(false)
const editData = ref<ApiKeyRow | null>(null)
const selectedKey = ref<ApiKeyDetail | null>(null)
const saveLoading = ref(false)
const detailLoading = ref(false)

const roles = ref<Array<{ id: string, name: string }>>([])
const form = reactive({
  name: '',
  env: 'production',
  status: 'active',
  roleIds: [] as string[],
  dailyLimit: null as number | null,
  ipWhitelistText: '',
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
  form.dailyLimit = null
  form.ipWhitelistText = ''
  open.value = true
}

function handleEdit(row: ApiKeyRow) {
  editData.value = row
  form.name = row.name || ''
  form.env = row.env || 'production'
  form.status = row.status || 'active'
  form.roleIds = row.roleIds || []
  form.dailyLimit = row.dailyLimit ?? null
  form.ipWhitelistText = (row.ipWhitelist || []).join('\n')
  open.value = true
}

async function handleShowDetail(row: ApiKeyRow) {
  selectedKey.value = row
  detailOpen.value = true
  detailLoading.value = true
  try {
    const res = await getApiKeyDetail(row.id)
    selectedKey.value = (res.data as ApiKeyDetail) || row
  }
  finally {
    detailLoading.value = false
  }
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
      await updateApiKey({
        ...form,
        id: editData.value.id,
        ipWhitelist: form.ipWhitelistText.split(whitespacePattern).map(item => item.trim()).filter(Boolean),
      })
    }
    else {
      await insertApiKey({
        ...form,
        ipWhitelist: form.ipWhitelistText.split(whitespacePattern).map(item => item.trim()).filter(Boolean),
      })
    }
    successToast()
    open.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
}

async function runLifecycleAction(row: ApiKeyRow, action: 'renew' | 'disable' | 'activate' | 'revoke') {
  if (action === 'revoke') {
    const confirmed = await confirm({
      title: 'Revoke API key?',
      description: 'The key will stop working immediately. This action should be used only when the key is compromised or retired.',
      confirmLabel: 'Revoke',
      loadingLabel: 'Revoking...',
      onConfirm: async () => {
        await updateApiKey({ id: row.id, action: 'revoke' })
        return true
      },
    })
    if (!confirmed)
      return
  }
  else {
    await updateApiKey({
      id: row.id,
      action,
      ...(action === 'renew' ? { extendDays: 30 } : {}),
    })
  }
  successToast()
  await refresh()
  await handleShowDetail({ ...row, status: action === 'disable' ? 'disabled' : row.status })
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
      dailyLimit: item.dailyLimit,
      ipWhitelist: (item.ipWhitelist || []).join(' '),
    })),
    'api-keys-export',
  )
}

function daysLeft(value?: string | null) {
  if (!value)
    return null
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000)
}

function expiryBadgeColor(value?: string | null): 'error' | 'warning' | 'neutral' | null {
  const left = daysLeft(value)
  if (left === null)
    return null
  if (left <= 1)
    return 'error'
  if (left <= 7)
    return 'warning'
  return null
}

const usageChartRows = computed(() =>
  (selectedKey.value?.usage30d || []).map(item => ({
    date: item.date,
    calls: item.calls,
  })),
)

function maskKey(key: string) {
  if (!key)
    return '-'
  return key.length > 16 ? `${key.substring(0, 12)}...${key.substring(key.length - 4)}` : key
}

function formatCost(cost?: number | null) {
  return `¥${Number(cost || 0).toFixed(8)}`
}

function formatLastUsed(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

const statusColor: Record<string, 'success' | 'error' | 'neutral' | 'warning'> = {
  active: 'success',
  revoked: 'error',
  expired: 'neutral',
  disabled: 'warning',
}

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
      :refresh="
        () => {
          page = 1
          refresh()
        }
      "
      :handle-add
      :handle-export
      @keyup.enter="
        () => {
          page = 1
          refresh()
        }
      "
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
        <UCheckbox :model-value="isSelected(row.original.id)" @update:model-value="toggleSelect(row.original.id)" />
      </template>
      <template #key-cell="{ row }">
        <code class="text-xs font-mono">{{ maskKey(row.original.key) }}</code>
      </template>
      <template #status-cell="{ row }">
        <div class="flex flex-wrap items-center gap-1">
          <UBadge :color="statusColor[row.original.status] || 'neutral'" variant="subtle" size="sm">
            {{ row.original.status }}
          </UBadge>
          <UBadge
            v-if="expiryBadgeColor(row.original.expiresAt)"
            :color="expiryBadgeColor(row.original.expiresAt)!"
            variant="subtle"
            size="xs"
          >
            {{ daysLeft(row.original.expiresAt) }}d left
          </UBadge>
        </div>
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
          <UButton size="xs" variant="ghost" icon="lucide:panel-right-open" @click="handleShowDetail(row.original)" />
          <UButton
            v-permission="'EDIT'"
            size="xs"
            variant="ghost"
            icon="lucide:edit"
            @click="handleEdit(row.original)"
          />
          <UButton
            v-permission="'DELETE'"
            size="xs"
            variant="ghost"
            color="error"
            icon="lucide:trash-2"
            @click="handleDelete(row.original.id)"
          />
        </div>
      </template>
    </UTable>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
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
              v-model="form.env"
              :items="[
                { label: p('envProduction'), value: 'production' },
                { label: p('envTest'), value: 'test' },
                { label: p('envDev'), value: 'dev' },
              ]"
            />
          </UFormField>
          <UFormField :label="p('status')">
            <USelect
              v-model="form.status"
              :items="[
                { label: p('statusActive'), value: 'active' },
                { label: 'Disabled', value: 'disabled' },
                { label: p('statusRevoked'), value: 'revoked' },
                { label: p('statusExpired'), value: 'expired' },
              ]"
            />
          </UFormField>
          <UFormField label="Daily limit">
            <UInput v-model.number="form.dailyLimit" type="number" min="0" placeholder="Unlimited" />
          </UFormField>
          <UFormField label="IP whitelist" hint="One IP or CIDR per line">
            <UTextarea v-model="form.ipWhitelistText" :rows="3" placeholder="192.168.1.10&#10;10.0.0.0/24" />
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
          <UButton
            v-permission="editData ? 'EDIT' : 'ADD'"
            :loading="saveLoading"
            :disabled="!form.name"
            @click="handleSubmit"
          >
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <USlideover v-model:open="detailOpen">
      <template #header>
        <div>
          <h3 class="font-bold">
            {{ selectedKey?.name || p('key') }}
          </h3>
          <p class="font-mono text-xs text-muted">
            {{ selectedKey ? maskKey(selectedKey.key) : '-' }}
          </p>
        </div>
      </template>
      <template #body>
        <div v-if="detailLoading" class="space-y-4">
          <USkeleton class="h-24 w-full" />
          <USkeleton class="h-32 w-full" />
          <USkeleton class="h-32 w-full" />
        </div>
        <div v-else-if="selectedKey" class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Status
              </p>
              <UBadge :color="statusColor[selectedKey.status] || 'neutral'" variant="subtle">
                {{ selectedKey.status }}
              </UBadge>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Expires in
              </p>
              <p class="font-medium">
                {{ daysLeft(selectedKey.expiresAt) ?? '-' }} days
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Calls
              </p>
              <p class="font-medium">
                {{ (selectedKey.calls || 0).toLocaleString() }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted">
                Cost
              </p>
              <p class="font-medium">
                {{ formatCost(selectedKey.cost) }}
              </p>
            </div>
          </div>

          <div class="rounded-md border p-3">
            <p class="mb-2 text-sm font-medium">
              Lifecycle
            </p>
            <div class="space-y-2 text-sm">
              <div
                v-for="item in selectedKey.lifecycle || []"
                :key="`${item.action}-${item.createdAt}`"
                class="flex justify-between gap-3"
              >
                <span class="text-muted">{{ item.action }}</span>
                <span class="text-right">{{ formatLastUsed(item.createdAt) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">Last used</span>
                <span class="text-right">{{ formatLastUsed(selectedKey.lastUsed) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-muted">Updated</span>
                <span class="text-right">{{ formatLastUsed(selectedKey.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-md border p-3">
            <p class="mb-2 text-sm font-medium">
              Guardrails
            </p>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Daily limit</span>
                <span>{{ selectedKey.dailyLimit || 'Unlimited' }}</span>
              </div>
              <div>
                <p class="text-muted">
                  IP whitelist
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  <UBadge v-for="ip in selectedKey.ipWhitelist || []" :key="ip" variant="soft">
                    {{ ip }}
                  </UBadge>
                  <span v-if="!selectedKey.ipWhitelist?.length" class="text-muted">Any IP</span>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-md border p-3">
            <p class="mb-2 text-sm font-medium">
              Last 30 days
            </p>
            <div v-if="usageChartRows.length" class="mb-3 h-40">
              <LineChart
                :data="usageChartRows"
                :height="160"
                :categories="{ calls: { name: 'Calls', color: '#3b82f6' } }"
                x-axis="date"
                :y-axis="['calls']"
                :y-grid-line="true"
              />
            </div>
            <div class="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <span class="text-muted">Calls</span>
                <p class="font-mono">
                  {{ (selectedKey.usage30d || []).reduce((sum, item) => sum + item.calls, 0).toLocaleString() }}
                </p>
              </div>
              <div>
                <span class="text-muted">Tokens</span>
                <p class="font-mono">
                  {{ (selectedKey.usage30d || []).reduce((sum, item) => sum + item.tokens, 0).toLocaleString() }}
                </p>
              </div>
              <div>
                <span class="text-muted">Cost</span>
                <p class="font-mono">
                  {{ formatCost((selectedKey.usage30d || []).reduce((sum, item) => sum + item.cost, 0)) }}
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-md border p-3">
            <p class="mb-2 text-sm font-medium">
              Top models
            </p>
            <div v-if="selectedKey.topModels?.length" class="space-y-2 text-sm">
              <div
                v-for="model in selectedKey.topModels"
                :key="model.model"
                class="flex items-center justify-between gap-3"
              >
                <span class="truncate">{{ model.model }}</span>
                <span class="font-mono text-xs text-muted">
                  {{ model.calls.toLocaleString() }} calls / {{ model.tokens.toLocaleString() }} tokens
                </span>
              </div>
            </div>
            <p v-else class="text-sm text-muted">
              No usage in the last 30 days
            </p>
          </div>

          <div class="flex gap-2">
            <UButton icon="lucide:edit" variant="outline" @click="handleEdit(selectedKey)">
              {{ $t('common.save') }}
            </UButton>
            <UButton icon="lucide:calendar-plus" variant="soft" @click="runLifecycleAction(selectedKey, 'renew')">
              Renew 30d
            </UButton>
            <UButton
              v-if="selectedKey.status === 'disabled'"
              icon="lucide:circle-play"
              variant="soft"
              @click="runLifecycleAction(selectedKey, 'activate')"
            >
              Activate
            </UButton>
            <UButton
              v-else-if="selectedKey.status === 'active'"
              color="warning"
              variant="soft"
              icon="lucide:pause-circle"
              @click="runLifecycleAction(selectedKey, 'disable')"
            >
              Disable
            </UButton>
            <UButton
              v-if="selectedKey.status !== 'revoked'"
              color="error"
              variant="soft"
              icon="lucide:ban"
              @click="runLifecycleAction(selectedKey, 'revoke')"
            >
              Revoke
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
