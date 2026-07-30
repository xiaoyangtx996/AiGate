<script setup lang="ts">
const {
  getPromptList,
  insertPrompt,
  updatePrompt,
  delPrompt,
  getPromptVersions,
  restorePromptVersion,
  renderPrompt,
  runPrompt,
  getModelList,
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
  variables?: Array<{ name: string, required?: boolean, defaultValue?: unknown }>
}

const DEFAULT_CATEGORY = '通用'
const PROMPT_VAR_RE = /\{\{\s*([a-z_][\w-]*)\s*\}\}/gi

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
  onDelete: async (items) => {
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
  variables: [] as Array<{ name: string, required: boolean, defaultValue: string, stale?: boolean }>,
})

const { data: modelOptionsData } = await useAsyncData('prompt-sandbox-models', async () => {
  const res = await getModelList({ page: 1, pageSize: 100 })
  return (res.data?.items || []).map(item => ({ label: item.name, value: item.name }))
})
const modelOptions = computed(() => modelOptionsData.value?.length ? modelOptionsData.value : [{ label: 'gpt-4o', value: 'gpt-4o' }])

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
  form.variables = []
  open.value = true
}

function handleEdit(row: PromptRow) {
  editData.value = row
  form.name = row.name || ''
  form.description = row.description || ''
  form.content = row.content || ''
  form.category = row.category || DEFAULT_CATEGORY
  form.variables = normalizeFormVariables(row.variables || [], form.content)
  open.value = true
}

function extractVariableNames(content: string) {
  const names = new Set<string>()
  for (const match of content.matchAll(PROMPT_VAR_RE))
    names.add(match[1]!)
  return [...names]
}

function normalizeFormVariables(
  variables: Array<{ name: string, required?: boolean, defaultValue?: unknown }>,
  content: string,
) {
  const names = extractVariableNames(content)
  const existing = new Map(variables.map(item => [item.name, item]))
  const result = names.map(name => ({
    name,
    required: existing.get(name)?.required !== false,
    defaultValue: String(existing.get(name)?.defaultValue ?? ''),
    stale: false,
  }))
  for (const item of variables) {
    if (!names.includes(item.name)) {
      result.push({
        name: item.name,
        required: item.required !== false,
        defaultValue: String(item.defaultValue ?? ''),
        stale: true,
      })
    }
  }
  return result
}

watch(
  () => form.content,
  (content) => {
    form.variables = normalizeFormVariables(form.variables, content)
  },
)

async function handleDelete(id: string) {
  await delPrompt(id)
  successToast()
  refresh()
}

async function handleSubmit() {
  if (!form.name || !form.content)
    return
  saveLoading.value = true
  try {
    const payload = { ...form, variables: form.variables.filter(item => !item.stale) }
    if (editData.value?.id) {
      await updatePrompt({ ...payload, id: editData.value.id })
    }
    else {
      await insertPrompt(payload)
    }
    successToast()
    open.value = false
    refresh()
  }
  finally {
    saveLoading.value = false
  }
}

const sandboxOpen = ref(false)
const sandboxPrompt = ref<PromptRow | null>(null)
const sandboxValues = reactive<Record<string, string>>({})
const sandboxModel = ref('gpt-4o')
const sandboxTemperature = ref(0.3)
const sandboxRendered = ref('')
const sandboxOutput = ref('')
const sandboxLoading = ref(false)
const abLeftVersion = ref('current')
const abRightVersion = ref('current')
const sandboxUsage = ref<{ total_tokens?: number } | null>(null)
const sandboxStream = ref(true)
const sandboxVersions = ref<{ id: string, version: number, content: string, createdAt: string }[]>([])

const sandboxVariables = computed(() =>
  normalizeFormVariables(sandboxPrompt.value?.variables || [], sandboxPrompt.value?.content || '').filter(item => !item.stale),
)

const versionOptions = computed(() => [
  { label: 'Current', value: 'current' },
  ...sandboxVersions.value.map(item => ({ label: `v${item.version}`, value: String(item.version) })),
])

async function previewSandbox() {
  if (!sandboxPrompt.value)
    return
  const res = await renderPrompt(sandboxPrompt.value.id, { values: sandboxValues })
  sandboxRendered.value = String(res.data?.rendered || '')
}

async function runSandbox() {
  if (!sandboxPrompt.value)
    return
  sandboxLoading.value = true
  sandboxOutput.value = ''
  sandboxUsage.value = null
  try {
    if (sandboxStream.value) {
      const response = await fetch(`/api/aigate/prompt/${sandboxPrompt.value.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: sandboxValues,
          model: sandboxModel.value,
          temperature: sandboxTemperature.value,
          stream: true,
        }),
      })
      if (!response.ok || !response.body)
        throw new Error('Sandbox stream failed')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done)
          break
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          const line = chunk.split('\n').find(item => item.startsWith('data: '))
          if (!line)
            continue
          const payload = line.slice(6).trim()
          if (!payload || payload === '[DONE]')
            continue
          const data = JSON.parse(payload) as { type?: string, content?: string, rendered?: string, usage?: { total_tokens?: number }, message?: string }
          if (data.type === 'start' && data.rendered)
            sandboxRendered.value = data.rendered
          if (data.type === 'delta')
            sandboxOutput.value += data.content || ''
          if (data.type === 'done') {
            sandboxOutput.value = data.message || sandboxOutput.value
            sandboxUsage.value = data.usage || null
          }
        }
      }
    }
    else {
      const res = await runPrompt(sandboxPrompt.value.id, {
        values: sandboxValues,
        model: sandboxModel.value,
        temperature: sandboxTemperature.value,
      })
      sandboxRendered.value = String(res.data?.rendered || '')
      sandboxOutput.value = String(res.data?.message || '')
      sandboxUsage.value = res.data?.usage || null
    }
  }
  finally {
    sandboxLoading.value = false
  }
}

function versionContent(version: string) {
  if (version === 'current')
    return sandboxPrompt.value?.content || ''
  return sandboxVersions.value.find(item => String(item.version) === version)?.content || ''
}

function diffLines(left: string, right: string) {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')
  const max = Math.max(leftLines.length, rightLines.length)
  return Array.from({ length: max }, (_, index) => ({
    left: leftLines[index] ?? '',
    right: rightLines[index] ?? '',
    changed: (leftLines[index] ?? '') !== (rightLines[index] ?? ''),
  }))
}

const abDiffRows = computed(() => diffLines(versionContent(abLeftVersion.value), versionContent(abRightVersion.value)))

async function loadVersionsForSandbox() {
  if (!sandboxPrompt.value)
    return
  const res = await getPromptVersions(sandboxPrompt.value.id)
  sandboxVersions.value = res.data ?? []
}

async function openSandbox(row: PromptRow) {
  sandboxPrompt.value = row
  sandboxRendered.value = ''
  sandboxOutput.value = ''
  sandboxUsage.value = null
  abLeftVersion.value = 'current'
  abRightVersion.value = 'current'
  for (const key of Object.keys(sandboxValues))
    delete sandboxValues[key]
  for (const variable of normalizeFormVariables(row.variables || [], row.content || '').filter(item => !item.stale))
    sandboxValues[variable.name] = String(variable.defaultValue || '')
  sandboxOpen.value = true
  await loadVersionsForSandbox()
}

const versionOpen = ref(false)
const versionPromptId = ref('')
const versions = ref<{ id: string, version: number, content: string, createdAt: string }[]>([])
const versionLoading = ref(false)

async function handleShowVersions(item: { id: string }) {
  versionPromptId.value = item.id
  versionOpen.value = true
  versionLoading.value = true
  try {
    const res = await getPromptVersions(item.id)
    versions.value = res.data ?? []
  }
  finally {
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
  if (!file)
    return
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
        <input ref="importInput" type="file" accept=".json" class="hidden" @change="handleImportFile">
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
    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="item in promptList" :key="item.id" class="hover:border-primary transition-colors">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="font-bold truncate">
              {{ item.name }}
            </h3>
            <p class="mt-1 text-sm text-muted line-clamp-2">
              {{ item.description || '-' }}
            </p>
          </div>
          <UCheckbox :model-value="isSelected(item.id)" @update:model-value="toggleSelect(item.id)" />
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <UBadge variant="outline" size="xs">
            {{ item.category }}
          </UBadge>
          <UBadge variant="subtle" size="xs">
            {{ normalizeFormVariables(item.variables || [], item.content || '').filter(v => !v.stale).length }} vars
          </UBadge>
          <span class="text-xs text-muted">{{ item.usageCount || 0 }} uses</span>
        </div>
        <div class="mt-4 flex justify-end gap-1">
          <UButton size="xs" variant="ghost" icon="lucide:history" @click="handleShowVersions(item)" />
          <UButton size="xs" variant="ghost" icon="lucide:flask-conical" @click="openSandbox(item)" />
          <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(item)" />
          <UButton v-permission="'DELETE'" size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(item.id)" />
        </div>
      </UCard>
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
          <div class="rounded-md border p-3">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-sm font-medium">
                Variables
              </p>
              <UBadge variant="subtle" size="xs">
                {{ form.variables.filter(item => !item.stale).length }}
              </UBadge>
            </div>
            <div v-if="form.variables.length" class="space-y-2">
              <div v-for="variable in form.variables" :key="variable.name" class="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <UInput :model-value="variable.name" disabled />
                <UCheckbox v-model="variable.required" label="Required" />
                <UInput v-model="variable.defaultValue" placeholder="Default value" :disabled="variable.stale" />
                <p v-if="variable.stale" class="sm:col-span-3 text-xs text-warning">
                  {{ variable.name }} no longer exists in the template and will be removed on save.
                </p>
              </div>
            </div>
            <p v-pre v-else class="text-sm text-muted">
              Use {{variable_name}} in the prompt content to add variables.
            </p>
          </div>
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
              <UBadge variant="subtle">
                v{{ v.version }}
              </UBadge>
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

    <UModal v-model:open="sandboxOpen">
      <template #header>
        <h3 class="font-bold">
          Prompt Sandbox
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-if="sandboxVariables.length" class="grid gap-3 sm:grid-cols-2">
            <UFormField v-for="variable in sandboxVariables" :key="variable.name" :label="variable.name">
              <UTextarea
                v-if="String(sandboxValues[variable.name] || '').length > 80"
                v-model="sandboxValues[variable.name]"
                :rows="3"
              />
              <UInput v-else v-model="sandboxValues[variable.name]" />
            </UFormField>
          </div>
          <p v-else class="text-sm text-muted">
            No variables detected.
          </p>

          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Model">
              <USelect v-model="sandboxModel" :items="modelOptions" />
            </UFormField>
            <UFormField :label="`Temperature ${sandboxTemperature}`">
              <UInput v-model.number="sandboxTemperature" type="range" min="0" max="1" step="0.1" />
            </UFormField>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <UCheckbox v-model="sandboxStream" label="Stream output" />
            <UButton variant="outline" icon="lucide:eye" @click="previewSandbox">
              Preview
            </UButton>
            <UButton icon="lucide:play" :loading="sandboxLoading" @click="runSandbox">
              Run
            </UButton>
          </div>

          <div v-if="sandboxRendered" class="rounded-md border p-3">
            <p class="mb-2 text-xs font-medium text-muted">
              Rendered prompt
            </p>
            <p class="whitespace-pre-wrap text-sm">
              {{ sandboxRendered }}
            </p>
          </div>

          <div v-if="sandboxOutput" class="rounded-md border p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-xs font-medium text-muted">
                Output
              </p>
              <UBadge v-if="sandboxUsage?.total_tokens" variant="subtle" size="xs">
                {{ sandboxUsage.total_tokens }} tokens
              </UBadge>
            </div>
            <p class="whitespace-pre-wrap text-sm">
              {{ sandboxOutput }}
            </p>
          </div>

          <div class="rounded-md border p-3">
            <p class="mb-3 text-sm font-medium">
              Version A/B Diff
            </p>
            <div class="mb-3 grid gap-3 sm:grid-cols-2">
              <USelect v-model="abLeftVersion" :items="versionOptions" placeholder="Version A" />
              <USelect v-model="abRightVersion" :items="versionOptions" placeholder="Version B" />
            </div>
            <div class="max-h-48 overflow-auto space-y-1 font-mono text-xs">
              <div
                v-for="(row, index) in abDiffRows"
                :key="index"
                class="grid grid-cols-2 gap-2 rounded px-2 py-1"
                :class="row.changed ? 'bg-warning/10' : ''"
              >
                <span class="truncate">{{ row.left || ' ' }}</span>
                <span class="truncate">{{ row.right || ' ' }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
