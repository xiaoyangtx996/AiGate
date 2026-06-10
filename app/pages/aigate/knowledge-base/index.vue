<script setup lang="ts">
interface KnowledgeBaseRow {
  id: string
  name: string
  description?: string | null
  status: string
  documentCount?: number
  size?: number
  embeddingModel?: string
}

interface KbDocument {
  id: string
  name: string
  type: string
  size: number
  chunks: number
  status: string
}

const {
  getKnowledgeBaseList,
  insertKnowledgeBase,
  updateKnowledgeBase,
  delKnowledgeBase,
  getKbDocuments,
  delKbDocument,
} = useAigateApi()
const { successToast, errorToast } = useAppToast()
const { t } = useI18n()
const { i18nCommon } = useMessage()
const confirm = useConfirmDialog()

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData('aigate-kb', async () => {
  const res = await getKnowledgeBaseList()
  return (res.data?.items ?? []) as KnowledgeBaseRow[]
})
const list = computed(() => data.value || [])
const selectedKb = ref<KnowledgeBaseRow | null>(null)

async function handleDelete(id: string) {
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delKnowledgeBase(id)
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    if (selectedKb.value?.id === id) selectedKb.value = null
    refresh()
  }
}

const statusColor: Record<string, 'success' | 'warning' | 'error'> = {
  ready: 'success',
  indexing: 'warning',
  error: 'error',
}
function formatSize(bytes: number) {
  return bytes > 1000000 ? `${(bytes / 1000000).toFixed(1)} MB` : `${(bytes / 1000).toFixed(0)} KB`
}
const documents = ref<KbDocument[]>([])
const docsLoading = ref(false)
const showCreate = ref(false)
const showEdit = ref(false)
const createForm = reactive({ name: '', description: '', embeddingModel: 'text-embedding-3-small' })
const editForm = reactive({ name: '', description: '', embeddingModel: 'text-embedding-3-small' })
const createLoading = ref(false)
const editLoading = ref(false)

const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.knowledgeBase.${key}`, params ?? {})

async function selectKb(kb: KnowledgeBaseRow) {
  selectedKb.value = kb
  docsLoading.value = true
  try {
    const res = await getKbDocuments(kb.id)
    documents.value = (res.data || []) as KbDocument[]
  } catch {
    documents.value = []
  } finally {
    docsLoading.value = false
  }
}

async function handleCreate() {
  if (!createForm.name) return
  createLoading.value = true
  try {
    await insertKnowledgeBase(createForm)
    successToast(p('createSuccess'))
    showCreate.value = false
    createForm.name = ''
    createForm.description = ''
    refresh()
  } finally {
    createLoading.value = false
  }
}

function handleEdit() {
  if (!selectedKb.value) return
  editForm.name = selectedKb.value.name || ''
  editForm.description = selectedKb.value.description || ''
  editForm.embeddingModel = selectedKb.value.embeddingModel || 'text-embedding-3-small'
  showEdit.value = true
}

async function handleUpdate() {
  if (!selectedKb.value || !editForm.name) return
  editLoading.value = true
  try {
    await updateKnowledgeBase({ id: selectedKb.value.id, ...editForm })
    successToast(p('updateSuccess'))
    selectedKb.value = { ...selectedKb.value, ...editForm }
    showEdit.value = false
    refresh()
  } finally {
    editLoading.value = false
  }
}

const uploading = ref(false)
const uploadQueue = ref<Array<{ name: string; progress: number }>>([])
const fileInput = ref<HTMLInputElement>()

function triggerFileUpload() {
  fileInput.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])

  if (!selectedKb.value || files.length === 0) return

  uploading.value = true
  uploadQueue.value = files.map(f => ({ name: f.name, progress: 0 }))

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const queueItem = uploadQueue.value[i]
      if (!file || !queueItem) continue

      const formData = new FormData()
      formData.append('file', file)
      formData.append('chunkSize', '1000')

      queueItem.progress = 10
      await $fetch(`/api/aigate/knowledge-base/${selectedKb.value.id}/documents`, {
        method: 'POST',
        body: formData,
      })
      queueItem.progress = 100
    }

    successToast(p('uploadSuccess', { count: files.length }))
    selectKb(selectedKb.value)
  } catch {
    errorToast(p('uploadFail'))
  } finally {
    uploading.value = false
    uploadQueue.value = []
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function handleDeleteDoc(docId: string) {
  if (!selectedKb.value) return
  const kb = selectedKb.value
  const confirmed = await confirm({
    title: i18nCommon('confirmDeleteTitle'),
    description: i18nCommon('confirmDeleteDescription'),
    confirmLabel: i18nCommon('confirmDelete'),
    loadingLabel: i18nCommon('inDelete'),
    onConfirm: async () => {
      await delKbDocument(kb.id, docId)
      return true
    },
  })
  if (confirmed) {
    successToast(i18nCommon('deleteSuccess'))
    selectKb(kb)
  }
}
</script>

<template>
  <div class="flex gap-4 h-[calc(100vh-120px)]">
    <div class="w-80 shrink-0 space-y-2 overflow-y-auto">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">
          {{ p('title') }}
        </h2>
        <UButton v-permission="'ADD'" size="xs" icon="lucide:plus" @click="showCreate = true">
          {{ p('create') }}
        </UButton>
      </div>
      <TableSkeleton v-if="loading" :cols="1" :rows="4" />
      <EmptyState
        v-else-if="list.length === 0"
        icon="lucide:library"
        :title="p('emptyTitle')"
        :description="p('emptyDescription')"
      />
      <UCard
        v-for="kb in list"
        v-else
        :key="kb.id"
        :class="selectedKb?.id === kb.id ? 'border-primary' : 'cursor-pointer hover:border-primary/50'"
        @click="selectKb(kb)"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-medium text-sm">
              {{ kb.name }}
            </h3>
            <p class="text-xs text-muted">
              {{ kb.documentCount || 0 }} {{ p('docs') }} · {{ formatSize(kb.size || 0) }}
            </p>
          </div>
          <UBadge :color="statusColor[kb.status] || 'neutral'" variant="subtle" size="xs">
            {{ kb.status }}
          </UBadge>
        </div>
      </UCard>
    </div>

    <div class="flex-1 overflow-y-auto">
      <template v-if="selectedKb">
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">
                {{ selectedKb.name }}
              </h3>
              <div class="flex gap-2">
                <UBadge :color="statusColor[selectedKb.status] || 'neutral'" variant="subtle">
                  {{ selectedKb.status }}
                </UBadge>
                <UButton v-permission="'EDIT'" size="xs" variant="ghost" icon="lucide:edit" @click="handleEdit" />
                <UButton
                  v-permission="'DELETE'"
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="lucide:trash-2"
                  @click="handleDelete(selectedKb.id)"
                />
              </div>
            </div>
          </template>
          <p class="text-sm text-muted">
            {{ selectedKb.description || p('noDescription') }}
          </p>
          <div class="grid grid-cols-3 gap-4 mt-3 text-sm">
            <div>
              <span class="text-muted">{{ p('docCount') }}：</span>{{ selectedKb.documentCount || 0 }}
            </div>
            <div>
              <span class="text-muted">{{ p('size') }}：</span>{{ formatSize(selectedKb.size || 0) }}
            </div>
            <div>
              <span class="text-muted">{{ p('embeddingModel') }}：</span>{{ selectedKb.embeddingModel }}
            </div>
          </div>
        </UCard>

        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">
                {{ p('docManage') }}
              </h3>
              <UButton
                v-permission="'ADD'"
                icon="lucide:upload"
                size="sm"
                :loading="uploading"
                @click="triggerFileUpload"
              >
                {{ p('upload') }}
              </UButton>
              <input
                ref="fileInput"
                type="file"
                multiple
                accept=".pdf,.txt,.md,.json"
                class="hidden"
                @change="handleFileSelect"
              />
            </div>
          </template>

          <div v-if="uploading" class="space-y-2 mb-4">
            <div v-for="file in uploadQueue" :key="file.name" class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>{{ file.name }}</span>
                <span>{{ file.progress }}%</span>
              </div>
              <UProgress :value="file.progress" />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-bold">
              {{ p('docList') }}
            </h3>
          </template>
          <TableSkeleton v-if="docsLoading" :cols="1" :rows="3" />
          <div v-else-if="documents.length > 0" class="space-y-2">
            <div v-for="doc in documents" :key="doc.id" class="flex items-center gap-3 p-3 rounded-lg border">
              <UIcon name="lucide:file-text" class="text-muted" />
              <div class="flex-1">
                <p class="font-medium text-sm">
                  {{ doc.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ doc.type }} · {{ formatSize(doc.size) }} · {{ doc.chunks }} {{ p('chunks') }}
                </p>
              </div>
              <UBadge
                :color="doc.status === 'ready' ? 'success' : doc.status === 'indexing' ? 'warning' : 'neutral'"
                variant="subtle"
                size="xs"
              >
                {{ doc.status }}
              </UBadge>
              <UButton
                v-permission="'DELETE'"
                size="xs"
                variant="ghost"
                color="error"
                icon="lucide:trash-2"
                @click="handleDeleteDoc(doc.id)"
              />
            </div>
          </div>
          <EmptyState v-else icon="lucide:file-plus" :title="p('noDocs')" :description="p('upload')" />
        </UCard>
      </template>

      <EmptyState
        v-else
        icon="lucide:library"
        :title="p('selectKb')"
        :description="p('emptyDescription')"
        class="h-full flex items-center justify-center"
      />
    </div>

    <UModal v-if="showEdit" v-model:open="showEdit">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ p('editTitle') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="editForm.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('description')">
            <UTextarea v-model="editForm.description" :placeholder="p('descriptionPlaceholder')" :rows="2" />
          </UFormField>
          <UFormField :label="p('embeddingModel')">
            <USelect
              v-model="editForm.embeddingModel"
              :items="[
                { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
                { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
              ]"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showEdit = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton v-permission="'EDIT'" :loading="editLoading" :disabled="!editForm.name" @click="handleUpdate">
            {{ $t('common.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-if="showCreate" v-model:open="showCreate">
      <template #header>
        <h3 class="text-lg font-bold">
          {{ p('createTitle') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="createForm.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('description')">
            <UTextarea v-model="createForm.description" :placeholder="p('descriptionPlaceholder')" :rows="2" />
          </UFormField>
          <UFormField :label="p('embeddingModel')">
            <USelect
              v-model="createForm.embeddingModel"
              :items="[
                { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
                { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
              ]"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showCreate = false">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton v-permission="'ADD'" :loading="createLoading" :disabled="!createForm.name" @click="handleCreate">
            {{ p('create') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
