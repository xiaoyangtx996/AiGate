<script setup lang="ts">
const route = useRoute()
const { getMcpTool, testMcpTool, createMcpToolVersion, updateMcpTool } = useAigateApi()
const { successToast, errorToast } = useAppToast()

const id = computed(() => String(route.params.id))
const activeTab = ref<'overview' | 'config' | 'versions'>('overview')
const testing = ref(false)
const versionSaving = ref(false)
const versionForm = reactive({
  version: '',
  changelog: '',
  configJson: '{}',
})

const {
  data,
  pending: loading,
  refresh,
} = await useAsyncData(`mcp-tool-${id.value}`, async () => {
  const res = await getMcpTool(id.value)
  return res.data
})

const tool = computed<any>(() => data.value)
const configSaving = ref(false)
const configForm = reactive({
  transportType: 'sse',
  command: '',
  argsText: '',
  envText: '',
  serverUrl: '',
  authType: 'none',
  authToken: '',
})

function parseArgs(text: string) {
  return text.split(/[\n,]/).map(item => item.trim()).filter(Boolean)
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

function syncConfigFormFromTool() {
  const value = tool.value
  if (!value)
    return
  configForm.transportType = value.transportType || value.type || 'sse'
  configForm.command = value.command || ''
  configForm.argsText = (value.args || []).join(', ')
  configForm.envText = Object.entries(value.env || {}).map(([k, v]) => `${k}=${v}`).join('\n')
  configForm.serverUrl = value.serverUrl || value.config?.endpoint || ''
  configForm.authType = value.authType || 'none'
  configForm.authToken = ''
}

watch(tool, () => syncConfigFormFromTool(), { immediate: true })

async function handleSaveConfig() {
  configSaving.value = true
  try {
    const args = parseArgs(configForm.argsText)
    const env = parseEnv(configForm.envText)
    const authConfig = configForm.authType === 'none'
      ? {}
      : configForm.authType === 'bearer'
        ? { token: configForm.authToken || undefined }
        : { headerName: 'Authorization', headerValue: configForm.authToken || undefined }

    await updateMcpTool({
      id: id.value,
      transportType: configForm.transportType,
      type: configForm.transportType,
      command: configForm.transportType === 'stdio' ? configForm.command : undefined,
      args: configForm.transportType === 'stdio' ? args : [],
      env: configForm.transportType === 'stdio' ? env : {},
      serverUrl: configForm.transportType === 'stdio' ? undefined : configForm.serverUrl,
      endpoint: configForm.transportType === 'stdio' ? configForm.command : configForm.serverUrl,
      authType: configForm.transportType === 'stdio' ? 'none' : configForm.authType,
      authConfig: configForm.transportType === 'stdio' ? {} : authConfig,
    })
    successToast('配置已保存')
    await refresh()
  }
  catch {
    errorToast('保存配置失败')
  }
  finally {
    configSaving.value = false
  }
}
const tabs = [
  { key: 'overview', label: '概览', icon: 'lucide:layout-dashboard' },
  { key: 'config', label: '配置', icon: 'lucide:settings' },
  { key: 'versions', label: '版本', icon: 'lucide:history' },
] as const

const connectionColor: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  connected: 'success',
  unknown: 'neutral',
  failed: 'error',
}

async function handleTest() {
  testing.value = true
  try {
    const res = await testMcpTool({ id: id.value })
    successToast(
      res.data?.skipped
        ? res.data.reason
        : res.data?.healthy
          ? `连接成功：${res.data.latency}ms`
          : `连接失败：${res.data?.error || '-'}`,
    )
    await refresh()
  }
  finally {
    testing.value = false
  }
}

async function handleCreateVersion() {
  if (!versionForm.version.trim())
    return
  versionSaving.value = true
  try {
    let config = {}
    try {
      config = JSON.parse(versionForm.configJson || '{}')
    }
    catch {
      errorToast('配置 JSON 格式错误')
      return
    }
    await createMcpToolVersion(id.value, {
      version: versionForm.version.trim(),
      changelog: versionForm.changelog,
      config,
    })
    successToast('版本已创建')
    versionForm.version = ''
    versionForm.changelog = ''
    versionForm.configJson = '{}'
    await refresh()
  }
  catch {
    errorToast('创建版本失败')
  }
  finally {
    versionSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/mcp-tools" />
        <div>
          <h2 class="text-xl font-bold">
            {{ tool?.name || 'MCP Tool' }}
          </h2>
          <p class="text-sm text-muted">
            {{ tool?.category || tool?.type }} · {{ tool?.transportType || tool?.type }}
          </p>
        </div>
      </div>
      <UButton icon="lucide:plug" :loading="testing" @click="handleTest">
        连接测试
      </UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="3" :rows="4" />
    <EmptyState v-else-if="!tool" icon="lucide:wrench" title="工具不存在" description="该工具不存在或您无权访问。" />
    <template v-else>
      <div class="flex flex-wrap gap-2 border-b border-default pb-2">
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

      <div v-if="activeTab === 'overview'" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <UCard class="lg:col-span-2">
          <template #header>
            <h3 class="font-bold">
              基础信息
            </h3>
          </template>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <span class="text-muted">名称</span><span>{{ tool.name }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-muted">描述</span><span class="text-right">{{ tool.description || '-' }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-muted">来源</span><span>{{ tool.sourceSlug || '手工注册' }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-muted">服务地址</span><code class="break-all text-right text-xs">{{ tool.serverUrl || '-' }}</code>
            </div>
          </div>
        </UCard>
        <UCard>
          <template #header>
            <h3 class="font-bold">
              连接状态
            </h3>
          </template>
          <div class="space-y-3">
            <UBadge :color="connectionColor[tool.connectionStatus || 'unknown'] || 'neutral'" variant="subtle">
              {{ tool.connectionStatus || 'unknown' }}
            </UBadge>
            <p class="text-sm text-muted">
              {{ tool.lastConnectedAt || '尚未连接成功' }}
            </p>
            <p v-if="tool.lastError" class="text-sm text-error break-all">
              {{ tool.lastError }}
            </p>
          </div>
        </UCard>
      </div>

      <UCard v-else-if="activeTab === 'config'">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-bold">
              配置
            </h3>
            <div class="flex gap-2">
              <UButton size="sm" variant="outline" icon="lucide:plug" :loading="testing" @click="handleTest">
                连接测试
              </UButton>
              <UButton size="sm" icon="lucide:save" :loading="configSaving" @click="handleSaveConfig">
                保存
              </UButton>
            </div>
          </div>
        </template>
        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Transport">
            <USelect
              v-model="configForm.transportType"
              :items="[
                { label: 'SSE', value: 'sse' },
                { label: 'Streamable HTTP', value: 'streamable_http' },
                { label: 'stdio', value: 'stdio' },
              ]"
            />
          </UFormField>

          <template v-if="configForm.transportType === 'stdio'">
            <UFormField label="Command">
              <UInput v-model="configForm.command" />
            </UFormField>
            <UFormField label="Args" class="md:col-span-2">
              <UTextarea v-model="configForm.argsText" :rows="2" />
            </UFormField>
            <UFormField label="Env" class="md:col-span-2">
              <UTextarea v-model="configForm.envText" :rows="4" placeholder="KEY=value" />
            </UFormField>
          </template>

          <template v-else>
            <UFormField label="Server URL" class="md:col-span-2">
              <UInput v-model="configForm.serverUrl" />
            </UFormField>
            <UFormField label="Auth">
              <USelect
                v-model="configForm.authType"
                :items="[
                  { label: 'none', value: 'none' },
                  { label: 'bearer', value: 'bearer' },
                  { label: 'header', value: 'header' },
                ]"
              />
            </UFormField>
            <UFormField v-if="configForm.authType !== 'none'" label="Auth value">
              <UInput v-model="configForm.authToken" type="password" placeholder="留空则保持原值" />
            </UFormField>
          </template>
        </div>
      </UCard>

      <UCard v-else>
        <template #header>
          <h3 class="font-bold">
            版本
          </h3>
        </template>
        <div class="mb-4 grid gap-3 md:grid-cols-2">
          <UFormField label="版本号" required>
            <UInput v-model="versionForm.version" placeholder="1.0.0" />
          </UFormField>
          <UFormField label="变更说明">
            <UInput v-model="versionForm.changelog" placeholder="变更说明" />
          </UFormField>
          <UFormField label="配置 JSON" class="md:col-span-2">
            <UTextarea v-model="versionForm.configJson" :rows="4" />
          </UFormField>
          <div class="md:col-span-2">
            <UButton icon="lucide:plus" :loading="versionSaving" @click="handleCreateVersion">
              新增版本
            </UButton>
          </div>
        </div>
        <EmptyState v-if="!tool.versions?.length" icon="lucide:history" title="暂无版本" description="该工具还没有版本记录。" />
        <div v-else class="space-y-2">
          <div v-for="version in tool.versions" :key="version.id" class="rounded-md border border-default p-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ version.version }}</span>
              <UBadge variant="outline">
                {{ version.active ? 'active' : 'inactive' }}
              </UBadge>
            </div>
            <p class="mt-1 text-muted">
              {{ version.changelog || '-' }}
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
