<script setup lang="ts">
interface MyApiKeyRow {
  id: string
  name: string
  key: string
  env?: string | null
  scopes?: string[] | null
  status: 'active' | 'revoked' | 'expired'
  calls?: number | null
  cost?: number | null
  dailyLimit?: number | null
  ipWhitelist?: string[] | null
  expiresAt?: string | null
  lastUsed?: string | null
  createdAt: string
}

const { t } = useI18n()
const { getMyApiKeyList, createMyApiKey, updateMyApiKey } = useAigateApi()
const { successToast } = useAppToast()
const confirm = useConfirmDialog()
const p = (key: string) => t(`pages.aigate.myApiKeys.${key}`)

const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const status = ref('')
const dialogOpen = ref(false)
const submitting = ref(false)
const editing = ref<MyApiKeyRow | null>(null)
const form = reactive({
  name: '',
  env: 'dev',
  scopes: ['read', 'write'],
  dailyLimit: undefined as number | undefined,
  ipWhitelistText: '',
  expiresAt: '',
})

const { data, pending: loading, refresh } = await useAsyncData('aigate-my-api-keys', async () => {
  const res = await getMyApiKeyList({
    page: page.value,
    pageSize: pageSize.value,
    keyword: keyword.value || undefined,
    status: status.value || undefined,
  })
  return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
}, { watch: [page, pageSize, status], dedupe: 'defer' })

const list = computed(() => (data.value?.items ?? []) as MyApiKeyRow[])
const total = computed(() => data.value?.total ?? 0)
const statusItems = computed(() => [
  { label: p('statusAll'), value: '' },
  { label: p('statusActive'), value: 'active' },
  { label: p('statusRevoked'), value: 'revoked' },
  { label: p('statusExpired'), value: 'expired' },
])
const envItems = computed(() => [
  { label: p('envDev'), value: 'dev' },
  { label: p('envStaging'), value: 'staging' },
  { label: p('envProd'), value: 'prod' },
])
const scopeItems = computed(() => [
  { label: p('scopeRead'), value: 'read' },
  { label: p('scopeWrite'), value: 'write' },
])
const statusColor: Record<string, 'success' | 'error' | 'neutral'> = {
  active: 'success',
  revoked: 'error',
  expired: 'neutral',
}

function search() {
  page.value = 1
  refresh()
}

function resetForm() {
  editing.value = null
  form.name = ''
  form.env = 'dev'
  form.scopes = ['read', 'write']
  form.dailyLimit = undefined
  form.ipWhitelistText = ''
  form.expiresAt = ''
}

function openCreate() {
  resetForm()
  dialogOpen.value = true
}

function openEdit(row: MyApiKeyRow) {
  editing.value = row
  form.name = row.name
  form.env = row.env || 'dev'
  form.scopes = row.scopes?.length ? [...row.scopes] : ['read', 'write']
  form.dailyLimit = row.dailyLimit || undefined
  form.ipWhitelistText = (row.ipWhitelist ?? []).join(', ')
  form.expiresAt = row.expiresAt ? new Date(row.expiresAt).toISOString().slice(0, 10) : ''
  dialogOpen.value = true
}

function buildPayload() {
  return {
    name: form.name,
    env: form.env,
    scopes: form.scopes,
    dailyLimit: form.dailyLimit || null,
    expiresAt: form.expiresAt || null,
    ipWhitelist: form.ipWhitelistText
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
  }
}

async function submit() {
  if (!form.name)
    return

  submitting.value = true
  try {
    if (editing.value) {
      await updateMyApiKey({ id: editing.value.id, ...buildPayload() })
      successToast(p('keyUpdated'))
    }
    else {
      await createMyApiKey(buildPayload())
      successToast(p('keyCreated'))
    }
    dialogOpen.value = false
    refresh()
  }
  finally {
    submitting.value = false
  }
}

async function revoke(row: MyApiKeyRow) {
  const confirmed = await confirm({
    title: p('confirmRevokeTitle'),
    description: p('confirmRevokeDescription'),
    confirmLabel: p('revoke'),
    loadingLabel: p('revoke'),
  })
  if (!confirmed)
    return

  await updateMyApiKey({ id: row.id, status: 'revoked' })
  successToast(p('keyRevoked'))
  refresh()
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function formatCost(cents?: number | null) {
  return `¥${((cents ?? 0) / 100).toFixed(2)}`
}

function maskedKey(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <div class="flex flex-wrap gap-2">
        <UInput v-model="keyword" class="w-48" icon="lucide:search" :placeholder="p('search')" @keyup.enter="search" />
        <USelect v-model="status" :items="statusItems" class="w-36" />
        <UButton icon="lucide:refresh-cw" variant="ghost" :loading="loading" @click="search" />
        <UButton icon="lucide:plus" @click="openCreate">
          {{ p('create') }}
        </UButton>
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="8" :rows="8" />
    <EmptyState
      v-else-if="list.length === 0"
      icon="lucide:key-round"
      :title="p('noKeys')"
      :description="p('noKeysDesc')"
    />
    <UTable
      v-else
      :data="list"
      :columns="[
        { accessorKey: 'name', header: p('name') },
        { accessorKey: 'key', header: 'Key' },
        { accessorKey: 'status', header: p('status') },
        { accessorKey: 'calls', header: p('calls') },
        { accessorKey: 'cost', header: p('cost') },
        { accessorKey: 'lastUsed', header: p('lastUsed') },
        { accessorKey: 'lifecycle', header: p('lifecycle') },
        { id: 'actions', header: '' },
      ]"
    >
      <template #name-cell="{ row }">
        <div>
          <p class="font-medium">
            {{ row.original.name }}
          </p>
          <p class="text-xs text-muted">
            {{ row.original.env || '-' }} · {{ (row.original.scopes || []).join(', ') }}
          </p>
        </div>
      </template>
      <template #key-cell="{ row }">
        <span class="font-mono text-xs">{{ maskedKey(row.original.key) }}</span>
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
        <span class="text-sm text-muted">{{ row.original.lastUsed ? formatDate(row.original.lastUsed) : p('notUsed') }}</span>
      </template>
      <template #lifecycle-cell="{ row }">
        <div class="text-xs text-muted">
          <p>{{ p('createdAt') }}：{{ formatDate(row.original.createdAt) }}</p>
          <p>{{ p('expiresAt') }}：{{ row.original.expiresAt ? formatDate(row.original.expiresAt) : p('never') }}</p>
        </div>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:pencil" @click="openEdit(row.original)" />
          <UButton
            v-if="row.original.status === 'active'"
            size="xs"
            variant="ghost"
            color="error"
            icon="lucide:ban"
            @click="revoke(row.original)"
          />
        </div>
      </template>
    </UTable>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>

    <UModal v-model:open="dialogOpen">
      <template #header>
        <h3 class="font-bold">
          {{ editing ? p('edit') : p('create') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" />
          </UFormField>
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField :label="p('env')">
              <USelect v-model="form.env" :items="envItems" />
            </UFormField>
            <UFormField :label="p('scopes')">
              <USelectMenu v-model="form.scopes" multiple :items="scopeItems" value-key="value" />
            </UFormField>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <UFormField :label="p('dailyLimit')">
              <UInput v-model.number="form.dailyLimit" type="number" min="1" :placeholder="p('unlimited')" />
            </UFormField>
            <UFormField :label="p('expiresAt')">
              <UInput v-model="form.expiresAt" type="date" />
            </UFormField>
          </div>
          <UFormField :label="p('ipWhitelist')" :help="p('ipHint')">
            <UInput v-model="form.ipWhitelistText" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="dialogOpen = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="submitting" @click="submit">
            {{ p('save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
