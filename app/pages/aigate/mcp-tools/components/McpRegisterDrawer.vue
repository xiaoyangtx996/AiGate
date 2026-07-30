<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ success: [] }>()

const { insertMcpTool, testMcpTool } = useAigateApi()
const { successToast, errorToast } = useAppToast()
const { t } = useI18n()
const p = (key: string, params?: Record<string, unknown>) => t(`pages.aigate.mcpTools.${key}`, params ?? {})

const step = ref(1)
const saveLoading = ref(false)
const testing = ref(false)
const testResult = ref<{ healthy?: boolean, skipped?: boolean, reason?: string, error?: string, latency?: number } | null>(null)

const form = reactive({
  name: '',
  description: '',
  transportType: 'sse' as 'stdio' | 'sse' | 'streamable_http',
  command: '',
  argsText: '',
  envText: '',
  serverUrl: '',
  authType: 'none',
  authToken: '',
})

const stepLabels = ['基础信息', '服务配置', '连接测试']

const transportOptions = [
  { label: p('typeSse'), value: 'sse' },
  { label: p('typeStreamable'), value: 'streamable_http' },
  { label: p('typeStdio'), value: 'stdio' },
]

const authOptions = [
  { label: 'None', value: 'none' },
  { label: 'Bearer', value: 'bearer' },
  { label: 'Header', value: 'header' },
]

function parseArgs(text: string) {
  return text
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function parseEnv(text: string) {
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed)
      continue
    const idx = trimmed.indexOf('=')
    if (idx <= 0)
      continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

function buildPayload() {
  const args = parseArgs(form.argsText)
  const env = parseEnv(form.envText)
  const authConfig = form.authType === 'none'
    ? {}
    : form.authType === 'bearer'
      ? { token: form.authToken }
      : { headerName: 'Authorization', headerValue: form.authToken }

  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    type: form.transportType,
    transportType: form.transportType,
    status: 'active',
    command: form.transportType === 'stdio' ? form.command.trim() : undefined,
    args: form.transportType === 'stdio' ? args : [],
    env: form.transportType === 'stdio' ? env : {},
    serverUrl: form.transportType === 'stdio' ? undefined : form.serverUrl.trim(),
    endpoint: form.transportType === 'stdio' ? form.command.trim() : form.serverUrl.trim(),
    authType: form.transportType === 'stdio' ? 'none' : form.authType,
    authConfig: form.transportType === 'stdio' ? {} : authConfig,
  }
}

function resetForm() {
  step.value = 1
  testResult.value = null
  form.name = ''
  form.description = ''
  form.transportType = 'sse'
  form.command = ''
  form.argsText = ''
  form.envText = ''
  form.serverUrl = ''
  form.authType = 'none'
  form.authToken = ''
}

watch(open, (value) => {
  if (value)
    resetForm()
})

function canGoNext() {
  if (step.value === 1)
    return form.name.trim().length > 0
  if (step.value === 2) {
    if (form.transportType === 'stdio')
      return form.command.trim().length > 0
    return form.serverUrl.trim().length > 0
  }
  return true
}

async function runTest() {
  if (form.transportType === 'stdio') {
    testResult.value = { skipped: true, reason: 'stdio 仅客户端可测' }
    return
  }
  testing.value = true
  testResult.value = null
  try {
    const payload = buildPayload()
    const res = await testMcpTool({ endpoint: payload.serverUrl, type: form.transportType })
    testResult.value = res.data as typeof testResult.value
  }
  catch (err) {
    testResult.value = { healthy: false, error: err instanceof Error ? err.message : '测试失败' }
  }
  finally {
    testing.value = false
  }
}

async function handleSubmit() {
  saveLoading.value = true
  try {
    await insertMcpTool(buildPayload())
    successToast()
    open.value = false
    emit('success')
  }
  catch (err) {
    errorToast(err instanceof Error ? err.message : '注册失败')
  }
  finally {
    saveLoading.value = false
  }
}

watch(step, (value) => {
  if (value === 3 && !testResult.value)
    void runTest()
})
</script>

<template>
  <USlideover v-model:open="open" :ui="{ content: 'max-w-md w-full' }">
    <template #header>
      <div>
        <h3 class="font-bold">
          {{ p('add') }}
        </h3>
        <p class="text-xs text-muted">
          步骤 {{ step }}/3 · {{ stepLabels[step - 1] }}
        </p>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex gap-1">
          <div
            v-for="(label, index) in stepLabels"
            :key="label"
            class="flex-1 rounded-md border px-1 py-1 text-center text-xs"
            :class="step === index + 1 ? 'border-primary bg-muted font-medium' : 'border-default text-muted'"
          >
            {{ label }}
          </div>
        </div>

        <div v-if="step === 1" class="space-y-4">
          <UFormField :label="p('name')" required>
            <UInput v-model="form.name" :placeholder="p('namePlaceholder')" />
          </UFormField>
          <UFormField :label="p('description')">
            <UTextarea v-model="form.description" :rows="3" :placeholder="p('descriptionPlaceholder')" />
          </UFormField>
        </div>

        <div v-else-if="step === 2" class="space-y-4">
          <UFormField :label="p('type')">
            <USelect v-model="form.transportType" :items="transportOptions" />
          </UFormField>

          <template v-if="form.transportType === 'stdio'">
            <UFormField label="Command" required>
              <UInput v-model="form.command" placeholder="npx" />
            </UFormField>
            <UFormField label="Args">
              <UTextarea v-model="form.argsText" :rows="2" placeholder="-y, @modelcontextprotocol/server-filesystem" />
            </UFormField>
            <UFormField label="Env">
              <UTextarea v-model="form.envText" :rows="3" placeholder="KEY=value" />
            </UFormField>
          </template>

          <template v-else>
            <UFormField :label="p('endpoint')" required>
              <UInput v-model="form.serverUrl" :placeholder="p('endpointPlaceholder')" />
            </UFormField>
            <UFormField label="Auth">
              <USelect v-model="form.authType" :items="authOptions" />
            </UFormField>
            <UFormField v-if="form.authType !== 'none'" label="Auth token / value">
              <UInput v-model="form.authToken" type="password" />
            </UFormField>
          </template>
        </div>

        <div v-else class="space-y-3">
          <div v-if="form.transportType === 'stdio'" class="rounded-md border border-default p-3 text-sm text-muted">
            stdio 传输跳过远程连接测试，可直接提交注册。
          </div>
          <template v-else>
            <UButton size="sm" variant="outline" icon="lucide:plug" :loading="testing" @click="runTest">
              重新测试连接
            </UButton>
            <div v-if="testResult" class="rounded-md border p-3 text-sm">
              <UBadge
                :color="testResult.skipped ? 'neutral' : testResult.healthy ? 'success' : 'error'"
                variant="subtle"
              >
                {{ testResult.skipped ? '跳过' : testResult.healthy ? '成功' : '失败' }}
              </UBadge>
              <p class="mt-2 text-muted">
                {{ testResult.reason || testResult.error || (testResult.latency ? `${testResult.latency}ms` : '') }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="open = false">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton v-if="step > 1" variant="ghost" @click="step -= 1">
          上一步
        </UButton>
        <UButton
          v-if="step < 3"
          :disabled="!canGoNext()"
          @click="step += 1"
        >
          下一步
        </UButton>
        <UButton
          v-else
          :loading="saveLoading"
          :disabled="!form.name.trim()"
          @click="handleSubmit"
        >
          提交注册
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
