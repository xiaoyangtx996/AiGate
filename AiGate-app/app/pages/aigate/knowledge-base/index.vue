<script setup lang="ts">
const { getKnowledgeBaseList, insertKnowledgeBase, delKnowledgeBase, getKbDocuments, uploadKbDocument, delKbDocument } = useAigateApi()
const { successToast, errorToast } = useAppToast()
const { data, pending: loading, refresh } = await useAsyncData('aigate-kb', async () => {
  const res = await getKnowledgeBaseList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
async function handleDelete(id: string) { await delKnowledgeBase(id); successToast(); refresh() }
const statusColor: Record<string, string> = { ready: 'success', indexing: 'warning', error: 'error' }
function formatSize(bytes: number) { return bytes > 1000000 ? `${(bytes / 1000000).toFixed(1)} MB` : `${(bytes / 1000).toFixed(0)} KB` }

const selectedKb = ref<any>(null)
const documents = ref<any[]>([])
const showCreate = ref(false)
const createForm = reactive({ name: '', description: '', embeddingModel: 'text-embedding-3-small' })
const createLoading = ref(false)

async function selectKb(kb: any) {
  selectedKb.value = kb
  try {
    const res = await getKbDocuments(kb.id)
    documents.value = res.data?.documents || []
  }
  catch { documents.value = [] }
}

async function handleCreate() {
  if (!createForm.name) return
  createLoading.value = true
  try {
    await insertKnowledgeBase(createForm)
    successToast('知识库创建成功')
    showCreate.value = false
    createForm.name = ''
    createForm.description = ''
    refresh()
  }
  finally { createLoading.value = false }
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
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kbId', selectedKb.value.id)
      formData.append('chunkSize', '1000')

      // 使用 $fetch 上传
      await $fetch(`/api/aigate/knowledge-base/${selectedKb.value.id}/documents`, {
        method: 'POST',
        body: formData,
        onUploadProgress: (progress) => {
          uploadQueue.value[i].progress = Math.round(progress * 100)
        },
      })
    }

    successToast(`成功上传 ${files.length} 个文档`)
    selectKb(selectedKb.value) // 刷新列表
  }
  catch (err) {
    errorToast('上传失败')
  }
  finally {
    uploading.value = false
    uploadQueue.value = []
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function handleDeleteDoc(docId: string) {
  if (!selectedKb.value) return
  await delKbDocument(selectedKb.value.id, docId)
  successToast()
  selectKb(selectedKb.value)
}
</script>

<template>
  <div class="flex gap-4 h-[calc(100vh-120px)]">
    <div class="w-80 shrink-0 space-y-2 overflow-y-auto">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold">知识库</h2>
        <UButton size="xs" icon="lucide:plus" @click="showCreate = true">创建</UButton>
      </div>
      <UCard
        v-for="kb in list" :key="kb.id"
        :class="selectedKb?.id === kb.id ? 'border-primary' : 'cursor-pointer hover:border-primary/50'"
        @click="selectKb(kb)"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-medium text-sm">{{ kb.name }}</h3>
            <p class="text-xs text-muted">{{ kb.documentCount || 0 }} 文档 · {{ formatSize(kb.size || 0) }}</p>
          </div>
          <UBadge :color="statusColor[kb.status] as any" variant="subtle" size="xs">{{ kb.status }}</UBadge>
        </div>
      </UCard>
    </div>

    <div class="flex-1 overflow-y-auto">
      <template v-if="selectedKb">
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">{{ selectedKb.name }}</h3>
              <div class="flex gap-2">
                <UBadge :color="statusColor[selectedKb.status] as any" variant="subtle">{{ selectedKb.status }}</UBadge>
                <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(selectedKb.id)" />
              </div>
            </div>
          </template>
          <p class="text-sm text-muted">{{ selectedKb.description || '暂无描述' }}</p>
          <div class="grid grid-cols-3 gap-4 mt-3 text-sm">
            <div><span class="text-muted">文档数：</span>{{ selectedKb.documentCount || 0 }}</div>
            <div><span class="text-muted">大小：</span>{{ formatSize(selectedKb.size || 0) }}</div>
            <div><span class="text-muted">嵌入模型：</span>{{ selectedKb.embeddingModel }}</div>
          </div>
        </UCard>

        <!-- 文件上传区域 -->
        <UCard class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-bold">文档管理</h3>
              <UButton
                icon="lucide:upload"
                size="sm"
                @click="triggerFileUpload"
                :loading="uploading"
              >
                上传文档
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

          <!-- 上传进度 -->
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
            <h3 class="font-bold">文档列表</h3>
          </template>
          <div v-if="documents.length > 0" class="space-y-2">
            <div v-for="doc in documents" :key="doc.id" class="flex items-center gap-3 p-3 rounded-lg border">
              <UIcon name="lucide:file-text" class="text-muted" />
              <div class="flex-1">
                <p class="font-medium text-sm">{{ doc.name }}</p>
                <p class="text-xs text-muted">{{ doc.type }} · {{ formatSize(doc.size) }} · {{ doc.chunks }} 分块</p>
              </div>
              <UBadge :color="doc.status === 'ready' ? 'success' : doc.status === 'indexing' ? 'warning' : 'neutral'" variant="subtle" size="xs">
                {{ doc.status }}
              </UBadge>
              <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDeleteDoc(doc.id)" />
            </div>
          </div>
          <div v-else class="text-center py-8 text-muted">
            <UIcon name="lucide:file-plus" class="text-3xl mb-2" />
            <p>暂无文档</p>
          </div>
        </UCard>
      </template>

      <div v-else class="flex items-center justify-center h-full text-muted">
        <div class="text-center">
          <UIcon name="lucide:library" class="text-4xl mb-2" />
          <p>选择一个知识库查看详情</p>
        </div>
      </div>
    </div>

    <UModal v-model:open="showCreate">
      <template #header>
        <h3 class="text-lg font-bold">创建知识库</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="createForm.name" placeholder="如：产品文档库" />
          </UFormField>
          <UFormField label="描述">
            <UTextarea v-model="createForm.description" placeholder="描述知识库的用途" :rows="2" />
          </UFormField>
          <UFormField label="嵌入模型">
            <USelect v-model="createForm.embeddingModel" :items="[
              { label: 'text-embedding-3-small', value: 'text-embedding-3-small' },
              { label: 'text-embedding-3-large', value: 'text-embedding-3-large' },
            ]" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="showCreate = false">取消</UButton>
          <UButton :loading="createLoading" :disabled="!createForm.name" @click="handleCreate">创建</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
