<script setup lang="ts">
const { insertAgent, getKnowledgeBaseList, getMcpToolList, getSkillList } = useAigateApi()
const { successToast } = useAppToast()
const router = useRouter()
const { t } = useI18n()

const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.agents.form.${key}`, params ?? {})

const form = reactive({
  name: '',
  description: '',
  model: 'gpt-4o',
  systemPrompt: '',
  temperature: 30,
  maxTokens: 4096,
  tags: [] as string[],
  memoryEnabled: true,
  shortTermMemorySize: 10,
  ragEnabled: false,
  ragCallMode: 'auto',
  mcpEnabled: false,
  skillEnabled: false,
  knowledgeBaseIds: [] as string[],
  toolIds: [] as string[],
  skillIds: [] as string[],
})

const tagInput = ref('')
const saving = ref(false)
const { data: bindingOptions } = await useAsyncData('agent-create-bindings', async () => {
  const [kbRes, toolRes, skillRes] = await Promise.all([
    getKnowledgeBaseList({ page: 1, pageSize: 100 }),
    getMcpToolList({ page: 1, pageSize: 100 }),
    getSkillList({ page: 1, pageSize: 100 }),
  ])
  return {
    knowledgeBases: kbRes.data?.items || [],
    tools: toolRes.data?.items || [],
    skills: skillRes.data?.items || [],
  }
})

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

function toggleSelection(list: string[], id: string, checked: boolean) {
  if (checked && !list.includes(id))
    list.push(id)
  if (!checked) {
    const index = list.indexOf(id)
    if (index >= 0)
      list.splice(index, 1)
  }
}

async function handleSave() {
  if (!form.name)
    return
  saving.value = true
  try {
    await insertAgent(form)
    successToast(p('createSuccess'))
    router.push('/aigate/agents')
  }
  finally {
    saving.value = false
  }
}

const step = ref(1)
const stepLabels = ['基础', '模型', '工具与知识库', '确认']

function nextStep() {
  if (step.value < 4)
    step.value += 1
}

function prevStep() {
  if (step.value > 1)
    step.value -= 1
}

const canNext = computed(() => {
  if (step.value === 1)
    return Boolean(form.name.trim())
  return true
})

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
      <div>
        <h2 class="text-xl font-bold">
          {{ p('createTitle') }}
        </h2>
        <p class="text-xs text-muted">
          步骤 {{ step }}/4 · {{ stepLabels[step - 1] }}
        </p>
      </div>
    </div>

    <div class="flex gap-2">
      <div
        v-for="(label, index) in stepLabels"
        :key="label"
        class="flex-1 rounded-md border px-2 py-1 text-center text-xs"
        :class="step === index + 1 ? 'border-primary bg-muted font-medium' : 'border-default text-muted'"
      >
        {{ label }}
      </div>
    </div>

    <UCard>
      <div v-if="step === 1" class="space-y-4">
        <UFormField :label="p('name')" required>
          <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
        </UFormField>
        <UFormField :label="p('description')">
          <UTextarea v-model="form.description" :placeholder="p('descriptionPlaceholder')" :rows="2" />
        </UFormField>
        <UFormField :label="p('systemPrompt')">
          <UTextarea v-model="form.systemPrompt" :placeholder="p('systemPromptPlaceholder')" :rows="6" />
        </UFormField>
        <UFormField :label="p('tags')">
          <div class="flex gap-2 mb-2 flex-wrap">
            <UBadge v-for="tag in form.tags" :key="tag" variant="subtle" class="cursor-pointer" @click="removeTag(tag)">
              {{ tag }} ×
            </UBadge>
          </div>
          <UInput v-model="tagInput" :placeholder="p('tagPlaceholder')" @keyup.enter="addTag" />
        </UFormField>
      </div>

      <div v-else-if="step === 2" class="space-y-4">
        <UFormField :label="p('model')">
          <USelect v-model="form.model" :items="models" />
        </UFormField>
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="p('temperature', { value: (form.temperature / 100).toFixed(2) })">
            <UInput v-model.number="form.temperature" type="range" :min="0" :max="100" :step="1" />
          </UFormField>
          <UFormField :label="p('maxTokens')">
            <UInput v-model.number="form.maxTokens" type="number" :min="256" :max="32768" />
          </UFormField>
        </div>
        <div class="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          <UCheckbox v-model="form.memoryEnabled" label="Short-term memory" />
          <UFormField label="Memory messages">
            <UInput v-model.number="form.shortTermMemorySize" type="number" :min="1" :max="50" />
          </UFormField>
        </div>
      </div>

      <div v-else-if="step === 3" class="space-y-4">
        <div class="grid gap-3 rounded-md border p-3 sm:grid-cols-2">
          <UCheckbox v-model="form.ragEnabled" label="RAG" />
          <UFormField v-if="form.ragEnabled" label="RAG mode">
            <USelect
              v-model="form.ragCallMode"
              :items="[
                { label: 'Auto', value: 'auto' },
                { label: 'Force', value: 'force' },
              ]"
            />
          </UFormField>
          <UCheckbox v-model="form.mcpEnabled" label="MCP tools" />
          <UCheckbox v-model="form.skillEnabled" label="Skills" />
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <div v-if="form.ragEnabled" class="space-y-2 rounded-md border p-3">
            <p class="text-sm font-medium">
              Knowledge Bases
            </p>
            <UCheckbox
              v-for="kb in bindingOptions?.knowledgeBases || []"
              :key="kb.id"
              :model-value="form.knowledgeBaseIds.includes(kb.id)"
              :label="kb.name"
              @update:model-value="value => toggleSelection(form.knowledgeBaseIds, kb.id, Boolean(value))"
            />
          </div>
          <div class="space-y-2 rounded-md border p-3">
            <p class="text-sm font-medium">
              MCP Tools
            </p>
            <UCheckbox
              v-for="tool in bindingOptions?.tools || []"
              :key="tool.id"
              :model-value="form.toolIds.includes(tool.id)"
              :label="tool.name"
              @update:model-value="value => toggleSelection(form.toolIds, tool.id, Boolean(value))"
            />
          </div>
          <div class="space-y-2 rounded-md border p-3">
            <p class="text-sm font-medium">
              Skills
            </p>
            <UCheckbox
              v-for="skill in bindingOptions?.skills || []"
              :key="skill.id"
              :model-value="form.skillIds.includes(skill.id)"
              :label="skill.name"
              @update:model-value="value => toggleSelection(form.skillIds, skill.id, Boolean(value))"
            />
          </div>
        </div>
      </div>

      <div v-else class="space-y-3 text-sm">
        <div class="flex justify-between"><span class="text-muted">Name</span><span>{{ form.name }}</span></div>
        <div class="flex justify-between"><span class="text-muted">Model</span><span>{{ form.model }}</span></div>
        <div class="flex justify-between"><span class="text-muted">RAG</span><span>{{ form.ragEnabled ? 'Enabled' : 'Disabled' }}</span></div>
        <div class="flex justify-between"><span class="text-muted">KB count</span><span>{{ form.knowledgeBaseIds.length }}</span></div>
        <div class="flex justify-between"><span class="text-muted">Tools</span><span>{{ form.toolIds.length }}</span></div>
        <div class="flex justify-between"><span class="text-muted">Skills</span><span>{{ form.skillIds.length }}</span></div>
      </div>
    </UCard>

    <div class="flex justify-between gap-2">
      <UButton v-if="step > 1" variant="ghost" @click="prevStep">
        上一步
      </UButton>
      <div v-else />
      <div class="flex gap-2">
        <UButton variant="ghost" to="/aigate/agents">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton v-if="step < 4" :disabled="!canNext" @click="nextStep">
          下一步
        </UButton>
        <UButton v-else :loading="saving" :disabled="!form.name" icon="lucide:save" @click="handleSave">
          {{ p('createAgent') }}
        </UButton>
      </div>
    </div>
  </div>
</template>
