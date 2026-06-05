<script setup lang="ts">
const { getPromptList, insertPrompt, updatePrompt, delPrompt, getPromptVersions, restorePromptVersion, exportPrompts, importPrompts } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()

const page = ref(1)
const pageSize = ref(20)

const { data, pending: loading, refresh } = await useAsyncData(
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

const open = ref(false)
const editData = ref<any>(null)
const saveLoading = ref(false)

const form = reactive({
  name: '',
  description: '',
  content: '',
  category: '通用',
})

function handleAdd() {
  editData.value = null
  form.name = ''
  form.description = ''
  form.content = ''
  form.category = '通用'
  open.value = true
}

function handleEdit(row: any) {
  editData.value = row
  form.name = row.name || ''
  form.description = row.description || ''
  form.content = row.content || ''
  form.category = row.category || '通用'
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

const p = (key: string) => t(`pages.aigate.prompts.${key}`)

const versionOpen = ref(false)
const versionPromptId = ref('')
const versions = ref<any[]>([])
const versionLoading = ref(false)

async function handleShowVersions(item: any) {
  versionPromptId.value = item.id
  versionOpen.value = true
  versionLoading.value = true
  try {
    const res = await getPromptVersions(item.id)
    versions.value = res.data ?? []
  }
  finally { versionLoading.value = false }
}

async function handleRestore(versionId: string) {
  await restorePromptVersion(versionPromptId.value, versionId)
  successToast('已恢复该版本')
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
  successToast(`已导入 ${res.data?.imported || 0} 条`)
  refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">{{ p('title') }}</h2>
      <div class="flex gap-2">
        <UButton icon="lucide:upload" variant="outline" @click="importInput?.click()">导入</UButton>
        <input ref="importInput" type="file" accept=".json" class="hidden" @change="handleImportFile">
        <UButton icon="lucide:download" variant="outline" @click="handleExport">导出</UButton>
        <UButton icon="lucide:plus" @click="handleAdd">{{ p('create') }}</UButton>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="item in list" :key="item.id" class="hover:border-primary transition-colors">
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-bold">{{ item.name }}</h3>
          <UBadge variant="outline" size="xs">{{ item.category }}</UBadge>
        </div>
        <p class="text-sm text-muted mb-3">{{ item.description }}</p>
        <div class="text-xs font-mono p-2 rounded bg-elevated mb-3 line-clamp-3">{{ item.content }}</div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">{{ item.usageCount || 0 }} {{ p('usage') }}</span>
          <div class="flex gap-1">
            <UButton size="xs" variant="ghost" icon="lucide:history" @click="handleShowVersions(item)" />
            <UButton size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit(item)" />
            <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(item.id)" />
          </div>
        </div>
      </UCard>
    </div>

    <div v-if="list.length === 0 && !loading" class="text-center py-12 text-muted">
      <UIcon name="lucide:message-square-text" class="text-4xl mb-2" />
      <p>{{ $t('common.noData') }}</p>
    </div>

    <div v-if="total > 0" class="flex justify-end">
      <UPagination
        v-model:page="page"
        :items-per-page="pageSize"
        :total="total"
      />
    </div>

    <UModal v-model:open="open">
      <template #header>
        <h3 class="text-lg font-bold">{{ editData ? $t('common.save') : p('create') }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('category')">
            <USelect v-model="form.category" :items="[
              { label: '通用', value: '通用' },
              { label: '代码', value: '代码' },
              { label: '写作', value: '写作' },
              { label: '翻译', value: '翻译' },
              { label: '分析', value: '分析' },
            ]" />
          </UFormField>
          <UFormField label="名称" required>
            <UInput v-model="form.name" placeholder="如：代码审查专家" />
          </UFormField>
          <UFormField label="描述">
            <UInput v-model="form.description" placeholder="简要描述这个提示词的用途" />
          </UFormField>
          <UFormField label="内容" required>
            <UTextarea v-model="form.content" placeholder="输入提示词内容..." :rows="6" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">{{ $t('common.cancel') }}</UButton>
          <UButton :loading="saveLoading" :disabled="!form.name || !form.content" @click="handleSubmit">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="versionOpen">
      <template #header><h3 class="font-bold">版本历史</h3></template>
      <template #body>
        <div v-if="versionLoading" class="text-center py-6">加载中...</div>
        <div v-else-if="versions.length === 0" class="text-center py-6 text-muted">暂无历史版本</div>
        <div v-else class="space-y-3">
          <UCard v-for="v in versions" :key="v.id">
            <div class="flex items-center justify-between mb-2">
              <UBadge variant="subtle">v{{ v.version }}</UBadge>
              <span class="text-xs text-muted">{{ new Date(v.createdAt).toLocaleString() }}</span>
            </div>
            <p class="text-sm font-mono line-clamp-3">{{ v.content }}</p>
            <UButton size="xs" class="mt-2" variant="outline" @click="handleRestore(v.id)">恢复此版本</UButton>
          </UCard>
        </div>
      </template>
    </UModal>
  </div>
</template>
