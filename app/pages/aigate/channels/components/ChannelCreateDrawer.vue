<script setup lang="ts">
interface ChannelPreset {
  id: string
  name: string
  vendor?: string
  vendorTag?: string
  endpoint?: string
  icon?: string
}

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  presets: ChannelPreset[]
}>()
const emit = defineEmits<{ success: [] }>()

const { insertChannel, testChannel, syncChannelModels } = useAigateApi()
const { successToast, errorToast } = useAppToast()
const { t } = useI18n()
const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.channels.${key}`, params ?? {})

const step = ref(1)
const feedback = ref('')
const saveLoading = ref(false)
const selectedPreset = ref('custom')

const form = reactive({
  name: '',
  vendor: '',
  vendorTag: '',
  endpoint: '',
  icon: '',
  apiKey: '',
})

const stepLabels = ['选择预设', '配置与验证']

function resetForm() {
  step.value = 1
  feedback.value = ''
  selectedPreset.value = 'custom'
  form.name = ''
  form.vendor = ''
  form.vendorTag = ''
  form.endpoint = ''
  form.icon = ''
  form.apiKey = ''
}

watch(open, (value) => {
  if (value)
    resetForm()
})

function applyPreset(presetId: string) {
  selectedPreset.value = presetId
  const preset = props.presets.find(item => item.id === presetId)
  if (!preset)
    return
  form.name = preset.name || ''
  form.vendor = preset.vendor || ''
  form.vendorTag = preset.vendorTag || ''
  form.endpoint = preset.endpoint || ''
  form.icon = preset.icon || ''
}

function goNext() {
  if (step.value === 1) {
    if (selectedPreset.value !== 'custom')
      applyPreset(selectedPreset.value)
    step.value = 2
  }
}

async function testAndSync(channelId: string) {
  feedback.value = '测试中…'
  const testRes = await testChannel(channelId)
  const testData = testRes.data as { healthy?: boolean, error?: string, message?: string } | undefined
  if (!testData?.healthy) {
    feedback.value = testData?.error || testData?.message || '测试失败'
    return false
  }
  feedback.value = '同步模型中…'
  const syncRes = await syncChannelModels(channelId)
  const syncData = syncRes.data as { total?: number, message?: string } | undefined
  feedback.value = syncData?.message || `已同步 ${syncData?.total ?? 0} 个模型`
  return true
}

async function handleCreate() {
  if (!form.name || !form.vendorTag || !form.endpoint)
    return
  saveLoading.value = true
  feedback.value = ''
  try {
    const res = await insertChannel({
      name: form.name,
      vendor: form.vendor || 'other',
      vendorTag: form.vendorTag,
      endpoint: form.endpoint,
      icon: form.icon || 'lucide:radio-tower',
      status: 'enabled',
      apiKey: form.apiKey || undefined,
    })
    const channelId = (res.data as { id?: string })?.id
    if (!channelId) {
      errorToast('渠道创建失败')
      return
    }
    const ok = await testAndSync(channelId)
    if (!ok) {
      errorToast(feedback.value || '测试或同步失败')
      return
    }
    successToast()
    open.value = false
    emit('success')
  }
  catch (err) {
    errorToast(err instanceof Error ? err.message : '创建失败')
  }
  finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :ui="{ content: 'max-w-md w-full' }">
    <template #header>
      <div>
        <h3 class="font-bold">
          {{ p('add') }}
        </h3>
        <p class="text-xs text-muted">
          步骤 {{ step }}/2 · {{ stepLabels[step - 1] }}
        </p>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
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

        <div v-if="step === 1" class="space-y-3">
          <p class="text-sm text-muted">
            选择渠道预设或自定义配置
          </p>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              class="rounded-md border border-default px-3 py-2 text-left transition-colors hover:border-primary"
              :class="selectedPreset === 'custom' ? 'border-primary bg-muted' : ''"
              @click="selectedPreset = 'custom'"
            >
              <div class="flex items-center gap-2">
                <UIcon name="lucide:settings-2" class="size-4 text-primary" />
                <span class="text-sm font-medium">自定义</span>
              </div>
              <p class="mt-1 text-xs text-muted">
                手动填写端点与厂商信息
              </p>
            </button>
            <button
              v-for="preset in presets"
              :key="preset.id"
              type="button"
              class="rounded-md border border-default px-3 py-2 text-left transition-colors hover:border-primary"
              :class="selectedPreset === preset.id ? 'border-primary bg-muted' : ''"
              @click="applyPreset(preset.id)"
            >
              <div class="flex items-center gap-2">
                <UIcon :name="preset.icon || 'lucide:plug'" class="size-4 text-primary" />
                <span class="truncate text-sm font-medium">{{ preset.name }}</span>
              </div>
              <p class="mt-1 truncate text-xs text-muted">
                {{ preset.endpoint || '预设端点' }}
              </p>
            </button>
          </div>
        </div>

        <div v-else class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('vendor')">
            <USelect
              v-model="form.vendor"
              :items="[
                { label: 'OpenAI', value: 'openai' },
                { label: 'Anthropic', value: 'anthropic' },
                { label: 'DeepSeek', value: 'deepseek' },
                { label: p('other'), value: 'other' },
              ]"
            />
          </UFormField>
          <UFormField label="Vendor Tag" required>
            <UInput v-model="form.vendorTag" placeholder="openai-compatible" />
          </UFormField>
          <UFormField label="Icon">
            <UInput v-model="form.icon" placeholder="lucide:radio-tower" />
          </UFormField>
          <UFormField :label="p('endpoint')" required>
            <UInput v-model="form.endpoint" :placeholder="p('endpointPlaceholder')" />
          </UFormField>
          <UFormField :label="p('apiKey')">
            <UInput v-model="form.apiKey" type="password" :placeholder="p('apiKeyPlaceholder')" />
          </UFormField>
          <p v-if="feedback" class="text-sm text-muted">
            {{ feedback }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="open = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton v-if="step > 1" variant="ghost" @click="step = 1">
          上一步
        </UButton>
        <UButton
          v-if="step === 1"
          @click="goNext"
        >
          下一步
        </UButton>
        <UButton
          v-else
          :loading="saveLoading"
          :disabled="!form.name || !form.vendorTag || !form.endpoint"
          @click="handleCreate"
        >
          创建并同步模型
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
