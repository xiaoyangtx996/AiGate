<script setup lang="ts">
const { insertAgent } = useAigateApi()
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
  if (!form.name)
    return
  saving.value = true
  try {
    await insertAgent(form)
    successToast(p('createSuccess'))
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
      <h2 class="text-xl font-bold">
        {{ p('createTitle') }}
      </h2>
    </div>

    <UCard>
      <div class="space-y-4">
        <UFormField :label="p('name')" required>
          <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
        </UFormField>

        <UFormField :label="p('description')">
          <UTextarea v-model="form.description" :placeholder="p('descriptionPlaceholder')" :rows="2" />
        </UFormField>

        <UFormField :label="p('model')">
          <USelect v-model="form.model" :items="models" />
        </UFormField>

        <UFormField :label="p('systemPrompt')">
          <UTextarea v-model="form.systemPrompt" :placeholder="p('systemPromptPlaceholder')" :rows="6" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="p('temperature', { value: (form.temperature / 100).toFixed(2) })">
            <UInput v-model.number="form.temperature" type="range" :min="0" :max="100" :step="1" />
          </UFormField>
          <UFormField :label="p('maxTokens')">
            <UInput v-model.number="form.maxTokens" type="number" :min="256" :max="32768" />
          </UFormField>
        </div>

        <UFormField :label="p('tags')">
          <div class="flex gap-2 mb-2">
            <UBadge v-for="tag in form.tags" :key="tag" variant="subtle" class="cursor-pointer" @click="removeTag(tag)">
              {{ tag }} ×
            </UBadge>
          </div>
          <UInput v-model="tagInput" :placeholder="p('tagPlaceholder')" @keyup.enter="addTag" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end gap-2">
      <UButton variant="ghost" to="/aigate/agents">
        {{ $t('common.cancel') }}
      </UButton>
      <UButton :loading="saving" :disabled="!form.name" icon="lucide:save" @click="handleSave">
        {{ p('createAgent') }}
      </UButton>
    </div>
  </div>
</template>
