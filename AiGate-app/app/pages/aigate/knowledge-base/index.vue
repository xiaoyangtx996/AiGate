<script setup lang="ts">
const { getKnowledgeBaseList, insertKnowledgeBase, delKnowledgeBase } = useAigateApi()
const { successToast } = useAppToast()
const { data, pending: loading, refresh } = await useAsyncData('aigate-kb', async () => {
  const res = await getKnowledgeBaseList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
async function handleDelete(id: string) { await delKnowledgeBase(id); successToast(); refresh() }
const statusColor: Record<string, string> = { ready: 'success', indexing: 'warning', error: 'error' }
function formatSize(bytes: number) { return bytes > 1000000 ? `${(bytes / 1000000).toFixed(1)} MB` : `${(bytes / 1000).toFixed(0)} KB` }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">知识库</h2>
      <UButton icon="lucide:plus">创建知识库</UButton>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="kb in list" :key="kb.id">
        <div class="flex items-start justify-between mb-3">
          <h3 class="font-bold">{{ kb.name }}</h3>
          <UBadge :color="statusColor[kb.status] as any" variant="subtle" size="sm">{{ kb.status }}</UBadge>
        </div>
        <p class="text-sm text-muted mb-3">{{ kb.description }}</p>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between"><span class="text-muted">文档数</span><span class="font-mono">{{ kb.documentCount }}</span></div>
          <div class="flex justify-between"><span class="text-muted">大小</span><span class="font-mono">{{ formatSize(kb.size) }}</span></div>
          <div class="flex justify-between"><span class="text-muted">嵌入模型</span><span>{{ kb.embeddingModel }}</span></div>
        </div>
      </UCard>
    </div>
  </div>
</template>
