<script setup lang="ts">
interface KbDocument {
  id: string
  name: string
  type: string
  size: number
  status: string
  chunks?: number
  chunkCount?: number
  tokenCount?: number
  errorMsg?: string | null
}

interface KbChunk {
  id: string
  documentId: string
  sort: number
  content: string
  tokenCount: number
  score?: number
}

const route = useRoute()
const router = useRouter()
const {
  getKnowledgeBase,
  updateKnowledgeBase,
  delKnowledgeBase,
  getKbDocuments,
  delKbDocument,
  retryKbDocument,
  getKbChunks,
  searchKnowledgeBase,
  rebuildKbVectors,
} = useAigateApi()
const { successToast, errorToast } = useAppToast()
const confirm = useConfirmDialog()
const id = computed(() => route.params.id as string)

const tabs = [
  { key: 'documents', label: 'Documents', icon: 'lucide:file-text' },
  { key: 'chunks', label: 'Chunks', icon: 'lucide:scissors' },
  { key: 'search', label: 'Search', icon: 'lucide:search' },
  { key: 'qa', label: 'QA', icon: 'lucide:message-circle-question' },
  { key: 'settings', label: 'Settings', icon: 'lucide:settings' },
] as const
const activeTab = ref<(typeof tabs)[number]['key']>('documents')

const { data: kb, pending: kbLoading, refresh: refreshKb } = await useAsyncData(
  () => `kb-detail-${id.value}`,
  async () => {
    const res = await getKnowledgeBase(id.value)
    return res.data as Record<string, any> | null
  },
  { watch: [id] },
)
const { data: docs, pending: docsLoading, refresh: refreshDocs } = await useAsyncData(
  () => `kb-docs-${id.value}`,
  async () => {
    const res = await getKbDocuments(id.value)
    return (res.data || []) as KbDocument[]
  },
  { watch: [id] },
)
const { data: chunks, pending: chunksLoading, refresh: refreshChunks } = await useAsyncData(
  () => `kb-chunks-${id.value}`,
  async () => {
    const res = await getKbChunks(id.value, { page: 1, pageSize: 50 })
    return (res.data?.items || []) as KbChunk[]
  },
  { watch: [id] },
)

const uploadInput = ref<HTMLInputElement>()
const uploading = ref(false)
const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref<KbChunk[]>([])
const qaQuery = ref('')
const qaLoading = ref(false)
const qaResult = ref<Record<string, any> | null>(null)
const deleteConfirmName = ref('')
const deleteModalOpen = ref(false)
const rebuildLoading = ref(false)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)
const settings = reactive({
  name: '',
  description: '',
  chunkSize: 1000,
  chunkOverlap: 200,
  topK: 5,
  dedupStrategy: 'reject',
  enabled: true,
})

watchEffect(() => {
  if (!kb.value)
    return
  settings.name = String(kb.value.name || '')
  settings.description = String(kb.value.description || '')
  settings.chunkSize = Number(kb.value.chunkSize || 1000)
  settings.chunkOverlap = Number(kb.value.chunkOverlap || 200)
  settings.topK = Number(kb.value.topK || 5)
  settings.dedupStrategy = String(kb.value.dedupStrategy || 'reject')
  settings.enabled = kb.value.enabled !== false
})

const hasProcessingDocs = computed(() =>
  (docs.value || []).some(doc => !['ready', 'failed'].includes(String(doc.status))),
)

watch(hasProcessingDocs, (active) => {
  if (active && !pollTimer.value) {
    pollTimer.value = setInterval(() => {
      refreshDocs()
    }, 5000)
  }
  else if (!active && pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}, { immediate: true })

onUnmounted(() => {
  if (pollTimer.value)
    clearInterval(pollTimer.value)
})

function formatSize(bytes = 0) {
  if (bytes >= 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function chooseUpload() {
  uploadInput.value?.click()
}

async function uploadDocuments(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0)
    return

  uploading.value = true
  try {
    const formData = new FormData()
    for (const file of files)
      formData.append('file', file)
    await $fetch(`/api/aigate/knowledge-base/${id.value}/documents`, { method: 'POST', body: formData })
    successToast('Documents uploaded')
    await Promise.all([refreshDocs(), refreshChunks(), refreshKb()])
  }
  catch {
    errorToast('Upload failed')
  }
  finally {
    uploading.value = false
    if (uploadInput.value)
      uploadInput.value.value = ''
  }
}

async function deleteDocument(doc: KbDocument) {
  const ok = await confirm({
    title: 'Delete document',
    description: `Delete ${doc.name}?`,
    confirmLabel: 'Delete',
    loadingLabel: 'Deleting...',
    onConfirm: async () => {
      await delKbDocument(id.value, doc.id)
      return true
    },
  })
  if (ok) {
    successToast('Document deleted')
    await Promise.all([refreshDocs(), refreshChunks(), refreshKb()])
  }
}

async function retryDocument(doc: KbDocument) {
  await retryKbDocument(id.value, doc.id)
  successToast('Retry submitted')
  await Promise.all([refreshDocs(), refreshChunks()])
}

async function runSearch() {
  if (!searchQuery.value.trim())
    return
  searchLoading.value = true
  try {
    const res = await searchKnowledgeBase(id.value, { query: searchQuery.value, topK: settings.topK })
    searchResults.value = ((res.data as { hits?: KbChunk[] } | null)?.hits || []) as KbChunk[]
  }
  finally {
    searchLoading.value = false
  }
}

async function runQa() {
  if (!qaQuery.value.trim())
    return
  qaLoading.value = true
  qaResult.value = { query: qaQuery.value, answer: '', references: [] }
  try {
    const response = await fetch(`/api/aigate/knowledge-base/${id.value}/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: qaQuery.value, topK: settings.topK, stream: true }),
    })
    if (!response.ok || !response.body)
      throw new Error('QA stream failed')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''
      for (const block of blocks) {
        const lines = block.split('\n')
        const eventLine = lines.find(line => line.startsWith('event: '))
        const dataLine = lines.find(line => line.startsWith('data: '))
        if (!eventLine || !dataLine)
          continue
        const eventName = eventLine.slice(7).trim()
        const payload = JSON.parse(dataLine.slice(6))
        if (eventName === 'references') {
          qaResult.value = { ...qaResult.value, references: payload.references || [] }
        }
        if (eventName === 'delta') {
          qaResult.value = {
            ...qaResult.value,
            answer: `${qaResult.value?.answer || ''}${payload.content || ''}`,
          }
        }
        if (eventName === 'done') {
          qaResult.value = {
            query: payload.query,
            answer: payload.answer,
            references: payload.references || qaResult.value?.references || [],
          }
        }
      }
    }
  }
  catch {
    errorToast('QA failed')
  }
  finally {
    qaLoading.value = false
  }
}

async function saveSettings() {
  await updateKnowledgeBase({ id: id.value, ...settings })
  successToast('Settings saved')
  await refreshKb()
}

async function deleteKb() {
  deleteConfirmName.value = ''
  deleteModalOpen.value = true
}

async function confirmDeleteKb() {
  if (deleteConfirmName.value !== kb.value?.name) {
    errorToast('请输入正确的知识库名称以确认删除')
    return
  }
  await delKnowledgeBase(id.value)
  successToast('Knowledge base deleted')
  deleteModalOpen.value = false
  router.push('/aigate/knowledge-base')
}

async function rebuildVectors() {
  const ok = await confirm({
    title: '清空重建向量',
    description: '将删除所有切片并重新向量化全部文档，耗时可能较长。',
    confirmLabel: '开始重建',
    loadingLabel: '提交中...',
    onConfirm: async () => {
      rebuildLoading.value = true
      try {
        await rebuildKbVectors(id.value)
        return true
      }
      finally {
        rebuildLoading.value = false
      }
    },
  })
  if (ok) {
    successToast('向量重建已启动')
    await Promise.all([refreshDocs(), refreshChunks(), refreshKb()])
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/knowledge-base" />
        <div class="min-w-0">
          <h2 class="truncate text-xl font-bold">
            {{ kb?.name || 'Knowledge Base' }}
          </h2>
          <p class="text-sm text-muted">
            {{ kb?.description || 'No description' }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <UBadge :color="kb?.status === 'ready' ? 'success' : 'warning'" variant="subtle">
          {{ kb?.status || 'loading' }}
        </UBadge>
        <UBadge variant="outline">
          {{ docs?.length || 0 }} docs
        </UBadge>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 border-b pb-2">
      <UButton
        v-for="tab in tabs"
        :key="tab.key"
        :icon="tab.icon"
        :variant="activeTab === tab.key ? 'solid' : 'ghost'"
        size="sm"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </UButton>
    </div>

    <TableSkeleton v-if="kbLoading" :cols="2" :rows="4" />

    <section v-else-if="activeTab === 'documents'" class="space-y-3">
      <div class="flex justify-end">
        <UButton icon="lucide:upload" :loading="uploading" @click="chooseUpload">
          Upload
        </UButton>
        <input ref="uploadInput" class="hidden" type="file" multiple accept=".txt,.md,.pdf,.json" @change="uploadDocuments">
      </div>
      <TableSkeleton v-if="docsLoading" :cols="1" :rows="5" />
      <EmptyState v-else-if="!docs?.length" icon="lucide:file-plus" title="No documents" description="Upload files to build chunks." />
      <div v-else class="space-y-2">
        <div v-for="doc in docs" :key="doc.id" class="flex items-center gap-3 rounded-md border p-3">
          <UIcon name="lucide:file-text" class="text-muted" />
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">
              {{ doc.name }}
            </p>
            <p class="text-xs text-muted">
              {{ doc.type }} / {{ formatSize(doc.size) }} / {{ doc.chunkCount || doc.chunks || 0 }} chunks / {{ doc.tokenCount || 0 }} tokens
            </p>
            <p v-if="doc.errorMsg" class="text-xs text-error">
              {{ doc.errorMsg }}
            </p>
          </div>
          <UBadge :color="doc.status === 'ready' ? 'success' : doc.status === 'failed' ? 'error' : 'warning'" variant="subtle">
            {{ doc.status }}
          </UBadge>
          <UButton v-if="doc.status === 'failed'" size="xs" variant="ghost" icon="lucide:refresh-cw" @click="retryDocument(doc)" />
          <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="deleteDocument(doc)" />
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'chunks'" class="space-y-2">
      <div class="flex justify-end">
        <UButton size="sm" variant="outline" icon="lucide:refresh-cw" @click="() => refreshChunks()">
          Refresh
        </UButton>
      </div>
      <TableSkeleton v-if="chunksLoading" :cols="1" :rows="6" />
      <EmptyState v-else-if="!chunks?.length" icon="lucide:scissors" title="No chunks" description="Ready documents will appear as chunks here." />
      <div v-else class="space-y-2">
        <div v-for="chunk in chunks" :key="chunk.id" class="rounded-md border p-3">
          <div class="mb-2 flex items-center justify-between text-xs text-muted">
            <span>#{{ chunk.sort }} / {{ chunk.tokenCount }} tokens</span>
            <span>{{ chunk.documentId }}</span>
          </div>
          <p class="whitespace-pre-wrap text-sm">
            {{ chunk.content }}
          </p>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'search'" class="space-y-3">
      <div class="flex gap-2">
        <UInput v-model="searchQuery" class="flex-1" placeholder="Search query" @keyup.enter="runSearch" />
        <UButton icon="lucide:search" :loading="searchLoading" @click="runSearch">
          Search
        </UButton>
      </div>
      <div class="space-y-2">
        <div v-for="chunk in searchResults" :key="chunk.id" class="rounded-md border p-3">
          <div class="mb-2 flex items-center justify-between text-xs text-muted">
            <span>chunk #{{ chunk.sort }}</span>
            <span>score {{ chunk.score ?? '-' }}</span>
          </div>
          <p class="whitespace-pre-wrap text-sm">
            {{ chunk.content }}
          </p>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'qa'" class="space-y-3">
      <div class="flex gap-2">
        <UInput v-model="qaQuery" class="flex-1" placeholder="Ask a question" @keyup.enter="runQa" />
        <UButton icon="lucide:send" :loading="qaLoading" @click="runQa">
          Ask
        </UButton>
      </div>
      <UCard v-if="qaResult">
        <p class="whitespace-pre-wrap text-sm">
          {{ qaResult.answer || qaResult.message || 'No answer' }}
        </p>
        <div v-if="qaResult.references?.length" class="mt-3 space-y-2">
          <div v-for="ref in qaResult.references" :key="ref.id || ref.chunkId" class="rounded-md bg-muted p-2 text-xs">
            {{ ref.content }}
          </div>
        </div>
      </UCard>
    </section>

    <section v-else class="max-w-2xl space-y-4">
      <UFormField label="Name" required>
        <UInput v-model="settings.name" />
      </UFormField>
      <UFormField label="Description">
        <UTextarea v-model="settings.description" :rows="3" />
      </UFormField>
      <div class="grid gap-4 sm:grid-cols-3">
        <UFormField label="Chunk size">
          <UInput v-model.number="settings.chunkSize" type="number" min="200" />
        </UFormField>
        <UFormField label="Chunk overlap">
          <UInput v-model.number="settings.chunkOverlap" type="number" min="0" />
        </UFormField>
        <UFormField label="Top K">
          <UInput v-model.number="settings.topK" type="number" min="1" max="20" />
        </UFormField>
      </div>
      <UFormField label="Dedup strategy">
        <USelect
          v-model="settings.dedupStrategy"
          :items="[
            { label: 'Reject', value: 'reject' },
            { label: 'Skip', value: 'skip' },
            { label: 'Overwrite', value: 'overwrite' },
          ]"
        />
      </UFormField>
      <UCheckbox v-model="settings.enabled" label="Enabled" />
      <UCard class="border-error/30">
        <template #header>
          <div class="font-medium text-error">
            危险操作
          </div>
        </template>
        <div class="space-y-3">
          <p class="text-sm text-muted">
            清空重建向量会删除全部切片并重新处理文档。
          </p>
          <UButton color="warning" variant="outline" icon="lucide:refresh-cw" :loading="rebuildLoading" @click="rebuildVectors">
            清空重建向量
          </UButton>
          <UButton color="error" variant="outline" icon="lucide:trash-2" @click="deleteKb">
            删除知识库
          </UButton>
        </div>
      </UCard>
      <div class="flex justify-end gap-2">
        <UButton icon="lucide:save" @click="saveSettings">
          Save settings
        </UButton>
      </div>
    </section>

    <UModal v-model:open="deleteModalOpen" title="确认删除知识库">
      <template #body>
        <p class="mb-3 text-sm text-muted">
          输入知识库名称 <strong>{{ kb?.name }}</strong> 以确认删除。
        </p>
        <UInput v-model="deleteConfirmName" placeholder="知识库名称" />
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="deleteModalOpen = false">
            取消
          </UButton>
          <UButton color="error" @click="confirmDeleteKb">
            确认删除
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
