<script setup lang="ts">
interface EnvField {
  key: string
  label: string
  placeholder: string
  required: boolean
}

const route = useRoute()
const router = useRouter()
const { getMcpMarketplaceDetail, installMcpMarketplacePreset } = useAigateApi()
const { successToast } = useAppToast()

const slug = computed(() => String(route.params.slug))
const activeTab = ref<'overview' | 'config' | 'install'>('overview')
const installing = ref(false)
const envForm = reactive<Record<string, string>>({})

const { data, pending: loading } = await useAsyncData(`mcp-marketplace-${slug.value}`, async () => {
  const res = await getMcpMarketplaceDetail(slug.value)
  return res.data
})

const preset = computed<any>(() => data.value)
const configText = computed(() => JSON.stringify(preset.value?.mcpServers || {}, null, 2))
const tabs = [
  { key: 'overview', label: '概览', icon: 'lucide:file-text' },
  { key: 'config', label: '配置', icon: 'lucide:braces' },
  { key: 'install', label: '安装', icon: 'lucide:download' },
] as const

watch(
  preset,
  (value) => {
    for (const key of Object.keys(envForm))
      delete envForm[key]
    for (const field of (value?.envSchema || []) as EnvField[])
      envForm[field.key] = ''
  },
  { immediate: true },
)

async function copyConfig() {
  await navigator.clipboard?.writeText(configText.value)
  successToast('配置已复制')
}

async function handleInstall() {
  installing.value = true
  try {
    await installMcpMarketplacePreset(slug.value, envForm)
    successToast('安装完成')
    router.push('/aigate/mcp-tools')
  }
  finally {
    installing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <UButton variant="ghost" icon="lucide:arrow-left" to="/aigate/mcp-tools/marketplace" />
        <div>
          <h2 class="text-xl font-bold">
            {{ preset?.name || 'MCP Marketplace' }}
          </h2>
          <p class="text-sm text-muted">
            {{ preset?.category }} · {{ preset?.transportType }}
          </p>
        </div>
      </div>
      <UButton icon="lucide:download" :loading="installing" @click="activeTab = 'install'">
        安装
      </UButton>
    </div>

    <TableSkeleton v-if="loading" :cols="3" :rows="4" />
    <EmptyState v-else-if="!preset" icon="lucide:package-x" title="预设不存在" description="该市场预设不存在或已下架。" />
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

      <UCard v-if="activeTab === 'overview'">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
            <UIcon :name="preset.icon || 'lucide:puzzle'" class="text-2xl text-primary" />
          </div>
          <div class="space-y-3">
            <div>
              <h3 class="font-bold">
                {{ preset.name }}
              </h3>
              <p class="text-sm text-muted">
                {{ preset.description }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge variant="subtle">
                {{ preset.vendor }}
              </UBadge>
              <UBadge variant="outline">
                {{ preset.category }}
              </UBadge>
              <UBadge variant="outline">
                {{ preset.transportType }}
              </UBadge>
            </div>
            <p class="whitespace-pre-wrap text-sm leading-6">
              {{ preset.usage }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard v-else-if="activeTab === 'config'">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold">
              mcpServers
            </h3>
            <UButton size="sm" variant="outline" icon="lucide:copy" @click="copyConfig">
              复制
            </UButton>
          </div>
        </template>
        <pre class="overflow-auto rounded-md bg-muted p-4 text-xs leading-5"><code>{{ configText }}</code></pre>
      </UCard>

      <UCard v-else>
        <template #header>
          <h3 class="font-bold">
            安装到当前组织
          </h3>
        </template>
        <div class="space-y-4">
          <EmptyState
            v-if="!preset.envSchema?.length"
            icon="lucide:check-circle"
            title="无需环境变量"
            description="该预设可直接安装。"
          />
          <template v-else>
            <UFormField v-for="field in preset.envSchema" :key="field.key" :label="field.label" :required="field.required">
              <UInput v-model="envForm[field.key]" :placeholder="field.placeholder" type="password" />
            </UFormField>
          </template>
        </div>
        <template #footer>
          <div class="flex justify-end">
            <UButton :loading="installing" icon="lucide:download" @click="handleInstall">
              安装
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>
