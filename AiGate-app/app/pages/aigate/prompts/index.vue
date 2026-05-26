<script setup lang="ts">
const { getPromptList, insertPrompt, delPrompt } = useAigateApi()
const { successToast } = useAppToast()
const { data, pending: loading, refresh } = await useAsyncData('aigate-prompts', async () => {
  const res = await getPromptList()
  return res.data ?? []
})
const list = computed(() => data.value || [])
async function handleDelete(id: string) { await delPrompt(id); successToast(); refresh() }
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">提示词库</h2>
      <UButton icon="lucide:plus">创建提示词</UButton>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard v-for="p in list" :key="p.id">
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-bold">{{ p.name }}</h3>
          <UBadge variant="outline" size="xs">{{ p.category }}</UBadge>
        </div>
        <p class="text-sm text-muted mb-3">{{ p.description }}</p>
        <div class="text-xs font-mono p-2 rounded bg-elevated mb-3 line-clamp-3">{{ p.content }}</div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">{{ p.usageCount }} 次使用</span>
          <div class="flex gap-1">
            <UButton size="xs" variant="ghost" icon="lucide:edit" />
            <UButton size="xs" variant="ghost" color="error" icon="lucide:trash-2" @click="handleDelete(p.id)" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
