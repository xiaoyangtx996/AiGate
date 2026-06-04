<script setup lang="ts">
const { insertAgent } = useAigateApi()
const { successToast } = useAppToast()
const router = useRouter()

const form = reactive({
  name: '',
  description: '',
  model: 'gpt-4o',
  systemPrompt: '',
  temperature: 30,
  maxTokens: 4096,
  tags: [] as string[],
})

const tagInput = ref('')
const saving = ref(false)

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter(t => t !== tag)
}

async function handleSave() {
  if (!form.name) return
  saving.value = true
  try {
    await insertAgent(form)
    successToast('Agent 创建成功')
    router.push('/aigate/agents')
  }
  finally { saving.value = false }
}

const models = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  { label: 'Claude Sonnet 4', value: 'claude-sonnet-4' },
  { label: 'Claude Opus 4', value: 'claude-opus-4' },
  { label: 'DeepSeek V3', value: 'deepseek-v3' },
]
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-center gap-3">
      <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/agents" />
      <h2 class="text-xl font-bold">创建 Agent</h2>
    </div>

    <UCard>
      <div class="space-y-4">
        <UFormField label="Agent 名称" required>
          <UInput v-model="form.name" placeholder="如：项目助手、代码审查 Agent" />
        </UFormField>

        <UFormField label="描述">
          <UTextarea v-model="form.description" placeholder="描述这个 Agent 的用途" :rows="2" />
        </UFormField>

        <UFormField label="模型">
          <USelect v-model="form.model" :items="models" />
        </UFormField>

        <UFormField label="系统提示词">
          <UTextarea v-model="form.systemPrompt" placeholder="定义 Agent 的行为和能力..." :rows="6" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="`温度: ${(form.temperature / 100).toFixed(2)}`">
            <UInput v-model.number="form.temperature" type="range" :min="0" :max="100" :step="1" />
          </UFormField>
          <UFormField label="最大输出 Token">
            <UInput v-model.number="form.maxTokens" type="number" :min="256" :max="32768" />
          </UFormField>
        </div>

        <UFormField label="标签">
          <div class="flex gap-2 mb-2">
            <UBadge v-for="tag in form.tags" :key="tag" variant="subtle" class="cursor-pointer" @click="removeTag(tag)">
              {{ tag }} ×
            </UBadge>
          </div>
          <UInput v-model="tagInput" placeholder="输入标签后回车" @keyup.enter="addTag" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end gap-2">
      <UButton variant="ghost" to="/aigate/agents">取消</UButton>
      <UButton :loading="saving" :disabled="!form.name" icon="lucide:save" @click="handleSave">创建 Agent</UButton>
    </div>
  </div>
</template>
