<script setup lang="ts">
import AgentCardSkeleton from '~/components/AgentCardSkeleton.vue'

interface EnvField {
  key: string
  label: string
  placeholder: string
  required: boolean
}

interface McpPreset {
  slug: string
  name: string
  description?: string | null
  vendor?: string | null
  transportType: string
  category?: string | null
  icon?: string | null
  installCount?: number
  installed?: boolean
  envSchema?: EnvField[]
}

const { getMcpMarketplace, installMcpMarketplacePreset, batchInstallMcpMarketplace } = useAigateApi()
const { successToast } = useAppToast()
const { t } = useI18n()
const p = (key: string) => t(`pages.aigate.mcpTools.marketplace.${key}`)

const { data, pending: loading, refresh } = await useAsyncData('mcp-marketplace-presets', async () => {
  const res = await getMcpMarketplace()
  return (res.data ?? []) as McpPreset[]
})
const presets = computed(() => data.value || [])
const searchQuery = ref('')
const category = ref('全部')
const installing = ref(false)
const installOpen = ref(false)
const batchOpen = ref(false)
const selectedPreset = ref<McpPreset | null>(null)
const envForm = reactive<Record<string, string>>({})
const batchQueue = ref<McpPreset[]>([])
const batchEnv = reactive<Record<string, Record<string, string>>>({})
const batchResult = ref<any>(null)

const categories = computed(() => ['全部', ...new Set(presets.value.map(item => item.category || '未分类'))])
const filteredPresets = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return presets.value.filter((tool) => {
    const matchCategory = category.value === '全部' || tool.category === category.value
    const matchSearch
      = !q
        || tool.name?.toLowerCase().includes(q)
        || tool.description?.toLowerCase().includes(q)
        || tool.vendor?.toLowerCase().includes(q)
    return matchCategory && matchSearch
  })
})

function resetEnv(target: Record<string, string>, schema: EnvField[] = []) {
  for (const key of Object.keys(target))
    delete target[key]
  for (const field of schema)
    target[field.key] = ''
}

function openInstall(tool: McpPreset) {
  selectedPreset.value = tool
  resetEnv(envForm, tool.envSchema)
  installOpen.value = true
}

async function handleInstall() {
  if (!selectedPreset.value)
    return
  installing.value = true
  try {
    await installMcpMarketplacePreset(selectedPreset.value.slug, envForm)
    successToast(p('installDone'))
    installOpen.value = false
    await refresh()
  }
  finally {
    installing.value = false
  }
}

function addToBatch(tool: McpPreset) {
  if (batchQueue.value.some(item => item.slug === tool.slug))
    return
  batchQueue.value.push(tool)
  const target: Record<string, string> = {}
  batchEnv[tool.slug] = target
  resetEnv(target, tool.envSchema)
}

function removeFromBatch(slug: string) {
  batchQueue.value = batchQueue.value.filter(item => item.slug !== slug)
  delete batchEnv[slug]
}

async function handleBatchInstall() {
  installing.value = true
  try {
    const res = await batchInstallMcpMarketplace(
      batchQueue.value.map(item => ({
        slug: item.slug,
        env: batchEnv[item.slug] || {},
      })),
    )
    batchResult.value = res.data
    successToast(`批量安装完成：${res.data?.success ?? 0}/${res.data?.total ?? 0}`)
    await refresh()
  }
  finally {
    installing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 class="text-xl font-bold">
          {{ p('title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ p('subtitle') }}
        </p>
      </div>
      <div class="flex flex-col gap-2 md:flex-row">
        <UInput v-model="searchQuery" :placeholder="p('search')" icon="lucide:search" class="md:w-64" />
        <UButton variant="outline" icon="lucide:layers" :disabled="batchQueue.length === 0" @click="batchOpen = true">
          待装 {{ batchQueue.length }}
        </UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[180px_1fr]">
      <aside class="space-y-2">
        <UButton
          v-for="item in categories"
          :key="item"
          block
          :variant="category === item ? 'solid' : 'ghost'"
          class="justify-start"
          @click="category = item"
        >
          {{ item }}
        </UButton>
      </aside>

      <div>
        <AgentCardSkeleton v-if="loading" :count="6" />
        <EmptyState
          v-else-if="filteredPresets.length === 0"
          icon="lucide:package-open"
          :title="presets.length === 0 ? p('emptyTitle') : p('noMatch')"
          :description="presets.length === 0 ? p('emptyDescription') : p('noMatchDesc')"
        />
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <UCard v-for="tool in filteredPresets" :key="tool.slug">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <UIcon :name="tool.icon || 'lucide:puzzle'" class="text-lg text-primary" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <h3 class="font-bold truncate">
                    {{ tool.name }}
                  </h3>
                  <UBadge v-if="tool.installed" color="success" variant="subtle" size="xs">
                    已安装
                  </UBadge>
                </div>
                <p class="text-xs text-muted">
                  {{ tool.category }} · {{ tool.transportType }}
                </p>
              </div>
            </div>
            <p class="mt-3 min-h-10 text-sm text-muted line-clamp-2">
              {{ tool.description }}
            </p>
            <div class="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{{ tool.vendor }}</span>
              <span>{{ tool.installCount || 0 }} installs</span>
            </div>
            <div class="mt-4 flex gap-2">
              <UButton size="sm" variant="outline" class="flex-1" :to="`/aigate/mcp-tools/marketplace/${tool.slug}`">
                详情
              </UButton>
              <UButton size="sm" variant="outline" icon="lucide:plus" @click="addToBatch(tool)" />
              <UButton size="sm" icon="lucide:download" :loading="installing && selectedPreset?.slug === tool.slug" @click="openInstall(tool)">
                安装
              </UButton>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <UModal v-model:open="installOpen">
      <template #header>
        <h3 class="text-lg font-bold">
          安装 {{ selectedPreset?.name }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <EmptyState
            v-if="!selectedPreset?.envSchema?.length"
            icon="lucide:check-circle"
            title="无需环境变量"
            description="该预设可直接安装。"
          />
          <UFormField
            v-for="field in selectedPreset?.envSchema || []"
            v-else
            :key="field.key"
            :label="field.label"
            :required="field.required"
          >
            <UInput v-model="envForm[field.key]" :placeholder="field.placeholder" type="password" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="installOpen = false">
            取消
          </UButton>
          <UButton :loading="installing" @click="handleInstall">
            安装
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="batchOpen">
      <template #header>
        <h3 class="text-lg font-bold">
          批量安装
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-for="tool in batchQueue" :key="tool.slug" class="rounded-md border border-default p-3">
            <div class="mb-3 flex items-center justify-between">
              <div class="font-medium">
                {{ tool.name }}
              </div>
              <UButton size="xs" variant="ghost" color="error" icon="lucide:x" @click="removeFromBatch(tool.slug)" />
            </div>
            <div v-if="tool.envSchema?.length" class="grid gap-2">
              <UFormField v-for="field in tool.envSchema" :key="field.key" :label="field.label" :required="field.required">
                <UInput v-model="batchEnv[tool.slug]![field.key]" :placeholder="field.placeholder" type="password" />
              </UFormField>
            </div>
            <p v-else class="text-sm text-muted">
              无需环境变量
            </p>
          </div>
          <div v-if="batchResult" class="rounded-md bg-muted p-3 text-sm">
            成功 {{ batchResult.success }}，失败 {{ batchResult.failed }}
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="batchOpen = false">
            关闭
          </UButton>
          <UButton :loading="installing" :disabled="batchQueue.length === 0" @click="handleBatchInstall">
            全部安装
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
