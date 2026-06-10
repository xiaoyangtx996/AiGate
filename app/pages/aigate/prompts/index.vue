<script setup lang="ts">
const {
  getPromptList,
  insertPrompt,
  updatePrompt,
  delPrompt,
  getPromptVersions,
  restorePromptVersion,
  exportPrompts,
  importPrompts,
} = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

interface PromptRow {
  id: string
  name?: string
  description?: string
  content?: string
  category?: string
  usageCount?: number
}

const DEFAULT_CATEGORY = '通用'

const page = ref(1)
const pageSize = ref(20)

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(
  'aigate-prompts',
  async () => {
    const res = await getPromptList({ page: page.value, pageSize: pageSize.value })
    return res.data ?? { items: [], total: 0, page: 1, pageSize: 20 }
  },
  {
    watch: [page, pageSize],
    dedupe: 'defer',
  },
)
const list = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const promptList = computed(() => list.value as PromptRow[])
const listIds = computed(() => promptList.value.map(item => item.id))

const {
  selectedCount,
  hasSelection,
  isSelected,
  toggleSelect,
  toggleSelectAll,
  isAllSelected,
  isSomeSelected,
  batchDelete,
} = useBatchOperations<{ id: string }>({
  onDelete: async items => {
    await Promise.all(items.map(item => delPrompt(item.id)))
    refresh()
  },
})

const open = ref(false)
const editData = ref<{ id: string } | null>(null)
const saveLoading = ref(false)

const form = reactive({
  name: '',
  description: '',
  content: '',
  category: DEFAULT_CATEGORY,
})

const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.prompts.${key}`, params ?? {})

const categoryOptions = computed(() => [
  { label: p('categories.general'), value: '通用' },
  { label: p('categories.code'), value: '代码' },
  { label: p('categories.writing'), value: '写作' },
  { label: p('categories.translation'), value: '翻译' },
  { label: p('categories.analysis'), value: '分析' },
])

function handleAdd() {
  editData.value = null
  form.name = ''
  form.description = ''
  form.content = ''
  form.category = DEFAULT_CATEGORY
  open.value = true
}

function handleEdit(row: PromptRow) {
  editData.value = row
  form.name = row.name || ''
  form.description = row.description || ''
  form.content = row.content || ''
  form.category = row.category || DEFAULT_CATEGORY
  open.value = true
}

async function handleDelete(id: string) {
  await delPrompt(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name || !form.content) return
  saveLoading.value = true
  try {
    if (editData.value?.id) {
      await updatePrompt({ ...form, id: editData.value.id })
    } else {
      await insertPrompt(form)
    }
    successToast()
    open.value = false
    refresh()
  } finally {
    saveLoading.value = false
  }
}

const versionOpen = ref(false)
const versionPromptId = ref('')
const versions = ref<{ id: string; version: number; content: string; createdAt: string }[]>([])
const versionLoading = ref(false)

async function handleShowVersions(item: { id: string }) {
  versionPromptId.value = item.id
  versionOpen.value = true
  versionLoading.value = true
  try {
    const res = await getPromptVersions(item.id)
    versions.value = res.data ?? []
  } finally {
    versionLoading.value = false
  }
}

async function handleRestore(versionId: string) {
  await restorePromptVersion(versionPromptId.value, versionId)
  successToast(p('versionRestored'))
  versionOpen.value = false
  refresh()
}

async function handleExport() {
  const res = await exportPrompts()
  const blob = new Blob([JSON.stringify(res.data || res, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'prompts-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

const importInput = ref<HTMLInputElement | null>(null)
async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  const items = JSON.parse(text)
  const res = await importPrompts(items)
  successToast(p('importDone', { count: res.data?.imported || 0 }))
  refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">
        {{ p('title') }}
      </h2>
      <div class="flex gap-2">
        <UButton v-permission="'ADD'" icon="lucide:upload" variant="outline" @click="importInput?.click()">
          {{ p('import') }}
        </UButton>
        <input ref="importInput" type="file" accept=".json" class="hidden" @change="handleImportFile" />
        <UButton v-permission="'SEARCH'" icon="lucide:download" variant="outline" @click="handleExport">
          {{ p('export') }}
        </UButton>
        <UButton v-permission="'ADD'" icon="lucide:plus" @click="handleAdd">
          {{ p('create') }}
        </UButton>
      </div>
    </div>

    <TableSkeleton v-if="loading" :cols="5" />
    <EmptyState v-else-if="list.length === 0" icon="lucide:message-square-text" :title="$t('common.noData')">
      <template #action>
        <UButton v-permission="'ADD'" icon="lucide:plus" @click="handleAdd">
          {{ p('create') }}
        </UButton>
      </template>
    </EmptyState>
    <UTable
      v-else
      :data="promptList"
      :columns="[
        { accessorKey: 'select', header: '' },
        { accessorKey: 'name', header: p('name') },
        { accessorKey: 'category', header: p('category') },
        { accessorKey: 'description', header: p('description') },
        { accessorKey: 'usageCount', header: p('usage') },
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
      <template #name-cell="{ row }">
        <span class="font-medium">{{ row.original.name }}</span>
      </template>
      <template #category-cell="{ row }">
        <UBadge variant="outline" size="xs">
          {{ row.original.category }}
        </UBadge>
      </template>
      <template #description-cell="{ row }">
        <span class="text-sm text-muted line-clamp-2">{{ row.original.description || '-' }}</span>
      </template>
      <template #usageCount-cell="{ row }">
        <span class="text-muted">{{ row.original.usageCount || 0 }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:history" @click="handleShowVersions(row.original)" />
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
          @click="batchDelete(promptList)"
        >
          {{ $t('common.batchDelete') }}
        </UButton>
      </div>
    </Transition>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ editData ? $t('common.save') : p('create') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('category')">
            <USelect v-model="form.category" :items="categoryOptions" />
          </UFormField>
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('description')">
            <UInput v-model="form.description" :placeholder="p('descriptionPlaceholder')" />
          </UFormField>
          <UFormField :label="p('content')" required>
            <UTextarea v-model="form.content" :placeholder="p('contentPlaceholder')" :rows="6" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton :loading="saveLoading" :disabled="!form.name || !form.content" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="versionOpen">
      <template #header>
        <h3 class="font-bold">
          {{ p('versionHistory') }}
        </h3>
      </template>
      <template #body>
        <div v-if="versionLoading" class="text-center py-6">
          {{ p('loading') }}
        </div>
        <div v-else-if="versions.length === 0" class="text-center py-6 text-muted">
          {{ p('noVersions') }}
        </div>
        <div v-else class="space-y-3">
          <UCard v-for="v in versions" :key="v.id">
            <div class="flex items-center justify-between mb-2">
              <UBadge variant="subtle"> v{{ v.version }} </UBadge>
              <span class="text-xs text-muted">{{ new Date(v.createdAt).toLocaleString() }}</span>
            </div>
            <p class="text-sm font-mono line-clamp-3">
              {{ v.content }}
            </p>
            <UButton v-permission="'EDIT'" size="xs" class="mt-2" variant="outline" @click="handleRestore(v.id)">
              {{ p('restoreVersion') }}
            </UButton>
          </UCard>
        </div>
      </template>
    </UModal>
  </div>
</template>
